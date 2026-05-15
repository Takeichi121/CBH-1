import { exec } from "child_process";
import { promisify } from "util";
import { streamLLM } from "../replit_integrations/chat/services/llm-router";
import { pushToBoss } from "../socket";

const execAsync = promisify(exec);

const ALLOWED_SHELL_PREFIXES = [
  "ls", "cat", "echo", "pwd", "date", "wc", "grep", "find", "head", "tail",
];

const SHELL_INJECTION_PATTERN = /[;&|`$<>\n\\]|\$\(|\$\{/;

function isSafeShellCommand(cmd: string): boolean {
  if (!cmd || typeof cmd !== "string") return false;
  if (SHELL_INJECTION_PATTERN.test(cmd)) return false;
  const trimmed = cmd.trim().toLowerCase();
  return ALLOWED_SHELL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export async function runChannTask(taskDescription: string) {
  let currentAttempt = 0;
  const maxRetries = 3;
  let lastError = "";

  while (currentAttempt < maxRetries) {
    console.log(`🤖 [Chann] วางแผนงานรอบที่ ${currentAttempt + 1}: ${taskDescription}`);

    let decision = "";
    await streamLLM({
      provider: "replit",
      mode: "code",
      message: `งานของนายคือ: ${taskDescription}
เครื่องมือที่มี:
1. shell: รันคำสั่ง terminal อ่านข้อมูลเท่านั้น (ls, cat, echo, grep, find, head, tail)
${lastError ? `รอบก่อนหน้าพลาด Error: ${lastError}` : ""}
ตอบกลับเป็น JSON เท่านั้น ไม่มีคำอธิบายเพิ่มเติม:
{ "tool": "shell", "command": "string" }`,
      history: [],
      onToken: (t) => { decision += t; },
    });

    try {
      const cleaned = decision.replace(/```json|```/g, "").trim();
      const plan = JSON.parse(cleaned) as { tool: string; command?: string };
      let result: any;

      if (plan.tool === "shell") {
        const cmd = plan.command || "";
        if (!isSafeShellCommand(cmd)) {
          throw new Error(`คำสั่ง shell ไม่ได้รับอนุญาต: "${cmd}"`);
        }
        const { stdout } = await execAsync(cmd, { timeout: 10000 });
        result = stdout;
      } else {
        throw new Error(`tool ไม่รู้จัก: "${plan.tool}"`);
      }

      console.log(`✅ [Chann] งานสำเร็จ: ${taskDescription}`);
      pushToBoss("chann-task-complete", {
        message: `✅ งานสำเร็จแล้วครับนาย: ${taskDescription}`,
        details: result,
      });
      return result;
    } catch (error: any) {
      lastError = error.message;
      currentAttempt++;
      console.log(`❌ [Chann] พลาดรอบที่ ${currentAttempt}: ${lastError}`);
    }
  }

  console.error(`[Chann] หมดรอบแล้ว ยังแก้ไม่ได้: ${lastError}`);
  pushToBoss("chann-alert", {
    title: "⚠️ งานไม่สำเร็จ",
    message: `ผมพยายามแก้ปัญหาให้ ${maxRetries} รอบแล้วแต่ยังติด Error: ${lastError} รบกวนนายช่วยดูหน่อยครับ`,
  });
  return null;
}

export const channExecuteTask = runChannTask;
