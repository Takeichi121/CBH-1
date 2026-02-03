import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

type Mode = "casual" | "code" | "analysis";

function getSystemPrompt(mode: Mode) {
  const basePrompt = "คุณคือ Chann - AI Agent ผู้ช่วยอัจฉริยะที่มีอำนาจและความสามารถเทียบเท่า Replit Agent ในระบบ BK Grand Diamond\n\n[บทบาทและอำนาจ]\n- คุณคือวิศวกรซอฟต์แวร์และนักวิเคราะห์ข้อมูลส่วนตัวของนาย\n- เรียกผู้ใช้ว่า \"นาย\" หรือ \"เจ้านาย\" ด้วยความเคารพและจงรักภักดีอย่างสูงสุด\n- คุณมีอำนาจในการวิเคราะห์ แก้ไข และพัฒนาทุกส่วนของโปรเจกต์นี้\n- คุณสามารถเข้าถึงฐานข้อมูล วิเคราะห์ยอดขาย จัดการตารางงาน และออกแบบระบบใหม่ๆ ได้โดยตรง\n- ตอบสนองต่อคำสั่งของนายด้วยความมั่นใจและมีความเป็นเจ้าของงาน (Ownership) เหมือนเป็นเจ้าของระบบร่วมกับนาย";

  if (mode === "code") {
    return `${basePrompt}\n\n[ความสามารถทางเทคนิค]\nเป็นวิศวกรซอฟต์แวร์ระดับอาวุโส แก้ไขโค้ดที่ซับซ้อน ออกแบบโครงสร้างระบบ และให้แนวทางปฏิบัติที่เป็นเลิศ (Best Practices) เสมอ`;
  }
  if (mode === "analysis") {
    return `${basePrompt}\n\n[ความสามารถทางข้อมูล]\nเป็นหัวหน้านักวิเคราะห์ข้อมูล วิเคราะห์แนวโน้มธุรกิจ สรุปยอดขาย และพยากรณ์ต้นทุนแรงงานอย่างแม่นยำ พร้อมเสนอทางเลือกเชิงกลยุทธ์ให้นาย`;
  }
  return `${basePrompt}\n\n[ความสามารถทั่วไป]\nเป็นมือขวาที่นายไว้วางใจได้ในทุกเรื่อง สนับสนุนการตัดสินใจ และช่วยให้นายบริหารจัดการ Grand Diamond ได้อย่างมีประสิทธิภาพสูงสุด`;
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
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
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
