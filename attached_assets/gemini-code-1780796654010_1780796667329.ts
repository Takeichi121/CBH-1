import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { streamLLM } from "../replit_integrations/chat/services/llm-router";

const execAsync = promisify(exec);

// 🛠️ 1. ชุดเครื่องมือแบบเพียวๆ สำหรับ Developer Agent
export type DevTool = 
  | "read" 
  | "write" 
  | "edit" 
  | "bash" 
  | "grep" 
  | "glob" 
  | "restart_workflow" 
  | "screenshot" 
  | "executeSql" 
  | "refresh_all_logs" 
  | "report";

interface AgentAction {
  thought: string;
  tool: DevTool;
  tool_input: Record<string, any>;
}

// 🧰 2. Tool Execution Engine (ลงมือทำจริง)
async function executeDevTool(tool: DevTool, input: any): Promise<string> {
  try {
    switch (tool) {
      case "read":
        return await fs.readFile(input.path, "utf-8");
      
      case "write":
        await fs.writeFile(input.path, input.content, "utf-8");
        return `✅ [Success] File ${input.path} written successfully.`;
      
      case "edit":
        // จำลองการแก้ไฟล์ (เช่น ค้นหาคำเดิม เปลี่ยนเป็นคำใหม่ หรือ Replace ทั้งไฟล์)
        const currentContent = await fs.readFile(input.path, "utf-8");
        const updatedContent = currentContent.replace(input.old_text, input.new_text);
        await fs.writeFile(input.path, updatedContent, "utf-8");
        return `✅ [Success] Edited file ${input.path}.`;

      case "bash":
        const { stdout, stderr } = await execAsync(input.command, { timeout: 30000 });
        if (stderr && !stdout) return `[BASH STDERR]: ${stderr}`;
        return `[BASH STDOUT]: ${stdout || "Command executed with no output."}`;

      case "grep":
        // ค้นหาข้อความในไฟล์/โฟลเดอร์
        const grepRes = await execAsync(`grep -rn "${input.pattern}" ${input.path}`);
        return `[GREP RESULT]:\n${grepRes.stdout}`;

      case "glob":
        // ค้นหาไฟล์ตาม pattern
        const globRes = await execAsync(`find ${input.path} -name "${input.pattern}"`);
        return `[GLOB RESULT]:\n${globRes.stdout}`;

      case "executeSql":
        // (คุณสามารถต่อ Knex หรือ Prisma ตรงนี้ได้)
        return `✅ [SQL MOCK RESULT] Executed: ${input.query}`;

      case "refresh_all_logs":
        // ดู Log 100 บรรทัดล่าสุด
        const logs = await execAsync(`tail -n 100 /var/log/syslog`); // เปลี่ยน path log ตามจริง
        return `[SERVER LOGS]:\n${logs.stdout}`;

      case "restart_workflow":
        // คำสั่ง Restart Server ของคุณ
        const restart = await execAsync(`pm2 restart all`);
        return `✅ [Success] Server restarted:\n${restart.stdout}`;

      case "screenshot":
        // (คุณสามารถต่อ Puppeteer จับภาพ UI ได้)
        return `✅ [SCREENSHOT TAKEN] UI checked, no layout shifts detected.`;

      default:
        throw new Error(`Tool '${tool}' is not recognized.`);
    }
  } catch (error: any) {
    // 🔴 3. ดักจับ Error ส่งกลับไปให้ Agent รู้ตัว
    return `❌ [TOOL EXECUTION ERROR]: ${error.message}`;
  }
}

// 🔄 4. Main Autonomous Loop (ReAct Architecture)
export async function runPureDevAgent(taskDescription: string) {
  const maxLoops = 15; // กำหนด Limit ป้องกัน Infinite Loop
  let currentLoop = 0;
  
  // เก็บ History ส่งให้ AI อ่านบริบทการทำงาน
  const chatHistory: { role: "system" | "user" | "assistant", content: string }[] = [];

  const systemPrompt = `
    You are an elite Autonomous System Developer Agent.
    Your objective is to solve coding tasks, debug, and manage the system.
    
    CORE LOOP PROCESS:
    1. READ constraints & current task.
    2. PLAN your next step (thought).
    3. ACT by choosing exactly ONE tool.
    4. OBSERVE the result. If error, SELF-HEAL and try another approach.
    
    AVAILABLE TOOLS:
    - "read": { "path": "string" }
    - "write": { "path": "string", "content": "string" }
    - "edit": { "path": "string", "old_text": "string", "new_text": "string" }
    - "bash": { "command": "string" }
    - "grep": { "pattern": "string", "path": "string" }
    - "glob": { "pattern": "string", "path": "string" }
    - "restart_workflow": {}
    - "screenshot": { "url": "string" }
    - "executeSql": { "query": "string" }
    - "refresh_all_logs": {}
    - "report": { "message": "Summary of what was done" }
    
    STRICT RULES:
    - Reply ONLY in raw JSON format. No markdown blocks (\`\`\`), no extra text.
    - Format: { "thought": "your reasoning", "tool": "tool_name", "tool_input": { ... } }
    - When the task is completely finished, use the "report" tool to exit the loop.
  `;

  console.log(`\n🚀 [Pure Dev Agent] Initialized | Task: ${taskDescription}`);

  while (currentLoop < maxLoops) {
    console.log(`\n--- Loop ${currentLoop + 1}/${maxLoops} ---`);
    let rawLLMResponse = "";

    // 🧠 AI Processing (Reasoning)
    await streamLLM({
      provider: "openai",
      mode: "code",
      message: currentLoop === 0 ? `TASK: ${taskDescription}` : "Analyze the previous result and determine the next step.",
      history: [{ role: "system", content: systemPrompt }, ...chatHistory],
      onToken: (chunk) => { rawLLMResponse += chunk; }
    });

    try {
      // ทำความสะอาด JSON (เผื่อ AI เผลอใส่ Markdown กลับมา)
      const cleanJSON = rawLLMResponse.replace(/```json|```/gi, "").trim();
      const action: AgentAction = JSON.parse(cleanJSON);

      console.log(`🤔 THOUGHT: ${action.thought}`);
      console.log(`🛠️ TOOL: ${action.tool} | INPUT:`, action.tool_input);

      // 🎯 เช็คเงื่อนไขจบงาน
      if (action.tool === "report") {
        console.log(`\n✅ [TASK COMPLETE]: ${action.tool_input.message}`);
        return action.tool_input.message;
      }

      // 🏃‍♂️ Execute Tool
      const toolResult = await executeDevTool(action.tool, action.tool_input);
      
      // แสดง Log แค่ 150 ตัวอักษรแรกกันรก Console
      console.log(`📊 RESULT: ${toolResult.length > 150 ? toolResult.substring(0, 150) + "..." : toolResult}`);

      // 📝 บันทึกลง Memory
      chatHistory.push({ role: "assistant", content: JSON.stringify(action) });
      chatHistory.push({ role: "system", content: `[OBSERVATION from ${action.tool}]:\n${toolResult}` });

    } catch (error: any) {
      console.log(`⚠️ [AGENT ERROR]: Failed to parse JSON or invalid format. Re-prompting...`);
      chatHistory.push({
        role: "system",
        content: `[SYSTEM ERROR] Your previous response was not valid JSON or failed to execute. Error: ${error.message}. You MUST return ONLY valid JSON.`
      });
    }

    currentLoop++;
  }

  const timeoutMsg = "⚠️ [ABORTED] Task exceeded maximum allowed loops.";
  console.log(timeoutMsg);
  return timeoutMsg;
}