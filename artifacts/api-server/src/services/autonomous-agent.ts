import fs from "fs/promises";
import { execFileSync } from "child_process";
import { db } from "../db";
import { sql } from "drizzle-orm";

export type DevTool =
  | "read"
  | "write"
  | "edit"
  | "bash"
  | "grep"
  | "glob"
  | "executeSql"
  | "refresh_logs"
  | "report";

export interface AgentAction {
  thought: string;
  tool: DevTool;
  tool_input: Record<string, unknown>;
}

export interface AgentStep {
  loop: number;
  thought: string;
  tool: DevTool;
  toolInput: Record<string, unknown>;
  result: string;
  isError: boolean;
}

export interface DevAgentResult {
  ok: boolean;
  report: string;
  steps: AgentStep[];
  loops: number;
}

const ALLOWED_BINS = [
  "npm", "npx", "node", "tsc", "ls", "cat", "grep", "find",
  "head", "tail", "wc", "echo", "pwd", "date",
];
const METACHAR_RE = /[;&|`$<>\n\\]|\$\(|\$\{/;

function safeExec(command: string): string {
  if (!command || typeof command !== "string") return "❌ คำสั่งว่างเปล่า";
  if (METACHAR_RE.test(command)) return "❌ คำสั่งมีอักขระไม่ปลอดภัย";
  const parts = command.trim().split(/\s+/);
  const bin = parts[0];
  if (!ALLOWED_BINS.includes(bin)) {
    return `❌ คำสั่ง '${bin}' ไม่ได้รับอนุญาต รายการที่อนุญาต: ${ALLOWED_BINS.join(", ")}`;
  }
  try {
    const out = execFileSync(bin, parts.slice(1), {
      timeout: 15000,
      maxBuffer: 512 * 1024,
      cwd: "/home/runner/workspace",
      encoding: "utf8",
    });
    return out || "(ไม่มี output)";
  } catch (e: any) {
    return `❌ [bash error] ${e.stderr || e.message}`;
  }
}

async function executeTool(tool: DevTool, input: Record<string, unknown>): Promise<string> {
  try {
    switch (tool) {
      case "read": {
        const path = String(input.path || "");
        if (!path) return "❌ ต้องระบุ path";
        const content = await fs.readFile(path, "utf-8");
        return content.slice(0, 8000) + (content.length > 8000 ? "\n...[truncated]" : "");
      }

      case "write": {
        const path = String(input.path || "");
        const content = String(input.content || "");
        if (!path) return "❌ ต้องระบุ path";
        await fs.writeFile(path, content, "utf-8");
        return `✅ เขียนไฟล์ ${path} สำเร็จ (${content.length} chars)`;
      }

      case "edit": {
        const path = String(input.path || "");
        const oldText = String(input.old_text || "");
        const newText = String(input.new_text || "");
        if (!path || !oldText) return "❌ ต้องระบุ path และ old_text";
        const current = await fs.readFile(path, "utf-8");
        if (!current.includes(oldText)) return `❌ ไม่พบข้อความที่ต้องการแก้ใน ${path}`;
        const updated = current.replace(oldText, newText);
        await fs.writeFile(path, updated, "utf-8");
        return `✅ แก้ไขไฟล์ ${path} สำเร็จ`;
      }

      case "bash": {
        const cmd = String(input.command || "");
        return safeExec(cmd);
      }

      case "grep": {
        const pattern = String(input.pattern || "");
        const path = String(input.path || ".");
        return safeExec(`grep -rn ${pattern} ${path}`);
      }

      case "glob": {
        const pattern = String(input.pattern || "");
        const path = String(input.path || ".");
        return safeExec(`find ${path} -name ${pattern}`);
      }

      case "executeSql": {
        const query = String(input.query || "");
        if (!query) return "❌ ต้องระบุ query";
        const lowerQ = query.trim().toLowerCase();
        if (!lowerQ.startsWith("select") && !lowerQ.startsWith("with")) {
          return "❌ runDevAgent อนุญาตเฉพาะ SELECT query เท่านั้น เพื่อความปลอดภัย";
        }
        const result = await db.execute(sql.raw(query));
        return JSON.stringify({ rows: result.rows?.slice(0, 50) });
      }

      case "refresh_logs": {
        return safeExec("tail -n 100 /tmp/logs/latest.log") ||
          "ไม่พบ log file ล่าสุด";
      }

      case "report": {
        return String(input.message || "งานเสร็จแล้ว");
      }

      default:
        return `❌ tool '${tool}' ไม่รู้จัก`;
    }
  } catch (e: any) {
    return `❌ [tool error] ${e.message}`;
  }
}

async function callLLM(messages: { role: string; content: string }[]): Promise<string> {
  let raw = "";
  try {
    const OpenAI = (await import("openai")).default;
    const key = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const base = process.env.OPENAI_API_KEY ? undefined : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const oai = new OpenAI({ apiKey: key, baseURL: base });
    const res = await oai.chat.completions.create({
      model: "gpt-4.1",
      messages: messages as any,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
    });
    raw = res.choices[0]?.message?.content || "{}";
  } catch (oaiErr: any) {
    const isQuota = oaiErr?.status === 429 || String(oaiErr?.message).includes("quota");
    if (isQuota && process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = gemini.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });
      const prompt = messages.map(m => `[${m.role}]: ${m.content}`).join("\n\n");
      const result = await model.generateContent(prompt);
      raw = result.response.text();
    } else {
      throw oaiErr;
    }
  }
  return raw;
}

const SYSTEM_PROMPT = `You are an elite Autonomous Developer Agent for a Burger King store management app.
Your job is to solve tasks using tools, one step at a time.

CORE LOOP (ReAct):
1. THINK — reason about what to do next (thought field)
2. ACT — choose ONE tool and its input
3. OBSERVE — you will receive the tool result
4. REPEAT — use the result to plan the next step
5. DONE — when finished, use the "report" tool

AVAILABLE TOOLS:
- "read": { "path": "string" } — read a file
- "write": { "path": "string", "content": "string" } — write/overwrite a file
- "edit": { "path": "string", "old_text": "string", "new_text": "string" } — replace text in a file
- "bash": { "command": "string" } — run shell (allowed: npm, npx, node, tsc, ls, cat, grep, find, head, tail, wc, echo, pwd, date)
- "grep": { "pattern": "string", "path": "string" } — search in files
- "glob": { "pattern": "string", "path": "string" } — find files
- "executeSql": { "query": "string" } — SELECT queries only
- "refresh_logs": {} — read latest server logs
- "report": { "message": "string" } — DONE. Final summary of what was accomplished.

RULES:
- Reply ONLY in valid JSON: { "thought": "...", "tool": "tool_name", "tool_input": { ... } }
- No markdown, no extra text — raw JSON only
- Self-heal on errors: if a tool fails, try a different approach
- Use "report" when done or when maxed out on attempts`;

export async function runDevAgent(
  taskDescription: string,
  onProgress?: (step: AgentStep) => void,
): Promise<DevAgentResult> {
  const MAX_LOOPS = 15;
  const steps: AgentStep[] = [];
  const history: { role: string; content: string }[] = [];
  let loops = 0;

  history.push({ role: "system", content: SYSTEM_PROMPT });
  history.push({ role: "user", content: `TASK: ${taskDescription}` });

  while (loops < MAX_LOOPS) {
    loops++;

    let raw = "";
    try {
      raw = await callLLM(history);
    } catch (llmErr: any) {
      const step: AgentStep = {
        loop: loops,
        thought: "LLM call failed",
        tool: "report" as DevTool,
        toolInput: {},
        result: `❌ LLM error: ${llmErr.message}`,
        isError: true,
      };
      steps.push(step);
      onProgress?.(step);
      break;
    }

    let action: AgentAction;
    try {
      const cleaned = raw.replace(/```json|```/gi, "").trim();
      action = JSON.parse(cleaned) as AgentAction;
    } catch {
      history.push({
        role: "user",
        content: `[SYSTEM ERROR] Invalid JSON response. You MUST return only valid JSON. Raw: ${raw.slice(0, 200)}`,
      });
      continue;
    }

    const toolResult = await executeTool(action.tool, action.tool_input);
    const isError = toolResult.startsWith("❌");

    const step: AgentStep = {
      loop: loops,
      thought: action.thought,
      tool: action.tool,
      toolInput: action.tool_input,
      result: toolResult,
      isError,
    };
    steps.push(step);
    onProgress?.(step);

    if (action.tool === "report") {
      return { ok: true, report: toolResult, steps, loops };
    }

    history.push({ role: "assistant", content: JSON.stringify(action) });
    history.push({
      role: "user",
      content: `[OBSERVATION from ${action.tool}]:\n${toolResult.slice(0, 4000)}`,
    });

    if (isError) {
      history.push({
        role: "user",
        content: `[SYSTEM] Tool returned an error. Self-heal: try a different approach or tool.`,
      });
    }
  }

  const timeoutReport = `⚠️ หมด loop limit (${MAX_LOOPS} รอบ) — งานที่ทำไปแล้ว: ${steps.filter(s => !s.isError).length} ขั้นตอนสำเร็จ`;
  return { ok: false, report: timeoutReport, steps, loops };
}

export const channExecuteTask = runDevAgent;
