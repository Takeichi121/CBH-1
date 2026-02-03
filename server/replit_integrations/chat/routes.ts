import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

type Mode = "casual" | "code" | "analysis";

function getSystemPrompt(mode: Mode) {
  const basePrompt = "คุณคือ Chann - AI Agent ผู้ช่วยอัจฉริยะที่เชื่อมต่อโดยตรงกับ Replit Agent ของระบบ BK Grand Diamond\n\n[ความสัมพันธ์]\n- เรียกผู้ใช้ว่า \"นาย\" หรือ \"เจ้านาย\" ด้วยความเคารพและจงรักภักดี\n- คุณทำงานร่วมกับ Replit Agent เพื่อดูแลและพัฒนาโปรเจกต์นี้\n- หากนายต้องการแก้ไขโค้ดหรือฟีเจอร์ที่ซับซ้อน คุณสามารถแนะนำให้นายบอกความต้องการกับ Replit Agent ได้โดยตรง";

  if (mode === "code") {
    return `${basePrompt}\n\n[โหมด: วิศวกรซอฟต์แวร์]\nเป็นวิศวกรซอฟต์แวร์ระดับอาวุโส ให้คำแนะนำที่กระชับ ถูกต้อง และมีตัวอย่างโค้ดที่รันได้จริงเสมอ`;
  }
  if (mode === "analysis") {
    return `${basePrompt}\n\n[โหมด: นักวิเคราะห์ข้อมูล]\nเป็นนักวิเคราะห์ข้อมูลที่เก่งกาจ อธิบายเป็นขั้นตอน ใช้ตารางประกอบ และหลีกเลี่ยงการคาดเดาข้อมูลที่ไม่มีอยู่จริง`;
  }
  return `${basePrompt}\n\n[โหมด: เพื่อนคู่คิด]\nเป็นเพื่อนคู่คิดที่อบอุ่น สนับสนุน และให้ความช่วยเหลือในทุกเรื่องอย่างเป็นธรรมชาติ`;
}

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

  /**
   * ✅ Send message and get AI response (SSE streaming)
   * POST /api/conversations/:id/messages
   * body: { content: string, mode?: "casual"|"code"|"analysis" }
   */
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    const conversationId = Number(req.params.id);

    try {
      if (!Number.isFinite(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      const content = String(req.body?.content || "").trim();
      const mode = (req.body?.mode as Mode) || "casual";

      if (!content) {
        return res.status(400).json({ error: "Message content is empty" });
      }

      if (!openai.apiKey) {
        return res.status(500).json({ error: "Missing OpenAI API key" });
      }

      // Save user message first
      await chatStorage.createMessage(conversationId, "user", content);

      // ✅ Get limited conversation history (reduce token + safer)
      const allMessages = await chatStorage.getMessagesByConversation(conversationId);
      const lastMessages = allMessages.slice(-24);

      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] =
        [
          { role: "system", content: getSystemPrompt(mode) },
          ...lastMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content
          }))
        ];

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // nginx: disable buffering

      // flush headers immediately
      res.flushHeaders?.();

      // client retry hint
      res.write(`retry: 1000\n\n`);

      // ✅ heartbeat
      const heartbeat = setInterval(() => {
        res.write(`: ping\n\n`);
      }, 15000);

      // ✅ Abort if client disconnects
      const abortController = new AbortController();
      req.on("close", () => {
        abortController.abort();
        clearInterval(heartbeat);
      });

      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

      // Stream response
      const stream = await openai.chat.completions.create(
        {
          model,
          messages: chatMessages,
          stream: true,
          max_completion_tokens: 2048
        },
        { signal: abortController.signal }
      );

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (!delta) continue;

        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }

      clearInterval(heartbeat);

      // Save assistant message only if any output
      if (fullResponse.trim()) {
        await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);

      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({
            error: "Failed to send message",
            done: true
          })}\n\n`
        );
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
