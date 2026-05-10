import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

// 👇 นำเข้า Service ที่เจ้านายเพิ่งสร้างมาใหม่ (llm-router จะจัดการสลับ AI ให้อัตโนมัติ)
import { streamLLM } from "./services/llm-router"; 
import type { Mode, Provider } from "./services/llm-types"; 

// สร้าง Client สำหรับฟังก์ชันสรุปแชท (Summary)
const openai = new OpenAI({
  apiKey:
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const title =
        typeof req.body?.title === "string" && req.body.title.trim()
          ? req.body.title.trim()
          : "New Chat";

      const conversation = await chatStorage.createConversation(title);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Generate conversation summary
  app.post("/api/conversations/:id/summary", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      const messages = await chatStorage.getMessagesByConversation(id);
      if (messages.length === 0) {
        return res.json({ summary: "ไม่มีข้อความในบทสนทนานี้" });
      }

      const conversationText = messages
        .map((m) => `${m.role === "user" ? "นาย" : "Chann"}: ${m.content}`)
        .join("\n");

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "คุณคือนักสรุปข้อมูลอัจฉริยะ สรุปบทสนทนาที่กำหนดให้สั้น กระชับ และได้ใจความสำคัญที่สุด โดยใช้ภาษาที่เป็นกันเองและเคารพ (เรียกผู้ใช้ว่านาย)"
          },
          {
            role: "user",
            content: `ช่วยสรุปบทสนทนานี้ให้ทีครับนาย:\n\n${conversationText}`
          }
        ],
        max_completion_tokens: 500
      });

      const summary = response.choices[0]?.message?.content || "ไม่สามารถสรุปได้ในขณะนี้";
      res.json({ summary });
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  /**
   * ✅ Send message and get AI response (SSE streaming - ใช้งาน LLM Router)
   * POST /api/conversations/:id/messages
   */
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    const conversationId = Number(req.params.id);

    try {
      if (!Number.isFinite(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      const content = String(req.body?.content || "").trim();
      const mode = (req.body?.mode as Mode) || "casual";
      const provider: Provider = "replit";

      if (!content) {
        return res.status(400).json({ error: "Message content is empty" });
      }

      // บันทึกข้อความของนายลงฐานข้อมูล
      await chatStorage.createMessage(conversationId, "user", content);

      // ดึงประวัติการสนทนา (จำกัดแค่ 20 ข้อความล่าสุด)
      const allMessages = await chatStorage.getMessagesByConversation(conversationId);
      const selectedMessages = allMessages.slice(-20);

      // เตรียมประวัติการสนทนาส่งให้ LLM Router (ไม่รวมข้อความล่าสุดที่เพิ่งบันทึกไป)
      const history = selectedMessages
        .slice(0, -1) 
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }));

      // ตั้งค่า Headers สำหรับ Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();
      res.write(`retry: 1000\n\n`);

      const heartbeat = setInterval(() => res.write(`: ping\n\n`), 15000);

      const abortController = new AbortController();
      req.on("close", () => {
        abortController.abort();
        clearInterval(heartbeat);
      });

      // ฟังก์ชันรับข้อความที่สตรีมกลับมาทีละคำ
      const onToken = (delta: string) => {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      };

      // 🧠 ดึง memory ที่เกี่ยวข้องกับข้อความล่าสุด
      let extraContext = "";
      try {
        const { searchMemory } = await import("../../services/chann-memory-service");
        const memHits = await searchMemory(content, { k: 3, maxDistance: 0.55 });
        if (memHits.length > 0) {
          extraContext = memHits
            .map((m: any, i: number) => `${i + 1}. [${m.kind}${m.sourceDate ? " " + m.sourceDate : ""}] ${m.content.slice(0, 400)}`)
            .join("\n");
        }
      } catch (e) {
        console.warn("memory lookup failed:", e);
      }

      // 👇 เรียกใช้ LLM Router 
      const fullResponse = await streamLLM({
        provider,
        mode,
        message: content,
        history,
        onToken,
        signal: abortController.signal,
        extraContext: extraContext || undefined,
      });

      clearInterval(heartbeat);

      // บันทึกข้อความของ Chann ลงฐานข้อมูลเมื่อสตรีมจบ
      if (fullResponse.trim()) {
        await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error(`Error streaming message:`, error);

      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message", done: true })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}