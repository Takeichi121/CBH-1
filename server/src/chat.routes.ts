import type { Express, Request, Response } from "express";
import { chatStorage } from "./storage";
import { streamLLM } from "./services/llm-router";
import type { Mode, Provider } from "./services/llm-types";

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
   * Streaming chat
   * POST /api/conversations/:id/messages
   * body: { content: string, mode?: Mode, provider?: Provider }
   */
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    const conversationId = Number(req.params.id);

    try {
      if (!Number.isFinite(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      const content = String(req.body?.content || "").trim();
      const mode = (req.body?.mode as Mode) || "casual";
      const provider = (req.body?.provider as Provider) || "auto";

      if (!content) {
        return res.status(400).json({ error: "Message content is empty" });
      }

      // save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // history (limit for speed)
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const lastMessages = messages.slice(-24).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      res.write(`retry: 1000\n\n`);

      // heartbeat
      const heartbeat = setInterval(() => res.write(`: ping\n\n`), 15000);

      // abort when client disconnects
      const abortController = new AbortController();
      req.on("close", () => {
        abortController.abort();
        clearInterval(heartbeat);
      });

      let fullResponse = "";

      fullResponse = await streamLLM({
        provider,
        mode,
        message: content,
        history: lastMessages,
        signal: abortController.signal,
        onToken: (delta) => {
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      });

      clearInterval(heartbeat);

      // save assistant message
      if (fullResponse.trim()) {
        await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);

      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message", done: true })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
