import { Elysia, t } from "elysia";
import { GeminiService } from "../services/geminiService.js";

const geminiService = new GeminiService();

export const chatController = new Elysia({ prefix: "/chat" })
  // POST method with new parameters
  .post("/", 
    async ({ body, set }) => {
      try {
        const response = await geminiService.generateChatResponse(body);
        return { success: true, data: response };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      body: t.Object({
        model: t.Optional(t.String()),
        sessionId: t.Optional(t.String()),
        systemPrompt: t.Optional(t.String()),
        message: t.String(),
        useTools: t.Optional(t.Boolean()),
        useThinking: t.Optional(t.Boolean())
      }),
      detail: {
        tags: ["chat"],
        summary: "Generate chat response with streaming",
        description: "Generate a streaming response from Gemini chat model with optional tools and thinking mode"
      }
    }
  )
  // GET method with new parameters
  .get("/", 
    async ({ query, set }) => {
      try {
        const response = await geminiService.generateChatResponse(query);
        return { success: true, data: response };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      query: t.Object({
        model: t.Optional(t.String()),
        sessionId: t.Optional(t.String()),
        systemPrompt: t.Optional(t.String()),
        message: t.String(),
        file: t.Optional(t.String()),
        useTools: t.Optional(t.Boolean()),
        useThinking: t.Optional(t.Boolean())
      }),
      detail: {
        tags: ["chat"],
        summary: "Generate chat response (GET) with streaming",
        description: "Generate a streaming response using query parameters with optional tools and thinking mode"
      }
    }
  )
  // Existing POST upload method
  .post("/upload",
    async ({ body, set }) => {
      try {
        const { file, ...chatRequest } = body;
        const response = await geminiService.generateChatResponse({
          ...chatRequest,
          file
        });
        return { success: true, data: response };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      body: t.Object({
        model: t.Optional(t.String()),
        sessionId: t.Optional(t.String()),
        systemPrompt: t.Optional(t.String()),
        message: t.String(),
        file: t.File()
      }),
      detail: {
        tags: ["chat"],
        summary: "Generate chat response with file upload",
        description: "Generate a response from Gemini chat model based on the provided message and uploaded file"
      }
    }
  )
  // New GET method with file URL
  .get("/with-file", 
    async ({ query, set }) => {
      try {
        const response = await geminiService.generateChatResponse(query);
        return { success: true, data: response };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      query: t.Object({
        model: t.Optional(t.String()),
        sessionId: t.Optional(t.String()),
        systemPrompt: t.Optional(t.String()),
        message: t.String(),
        file: t.String() // Required URL string
      }),
      detail: {
        tags: ["chat"],
        summary: "Generate chat response with file URL (GET)",
        description: "Generate a response from Gemini chat model with a file provided via URL"
      }
    }
  );