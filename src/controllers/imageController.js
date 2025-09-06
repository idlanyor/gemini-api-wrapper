import { Elysia, t } from "elysia";
import { GeminiService } from "../services/geminiService.js";

const geminiService = new GeminiService();

export const imageController = new Elysia({ prefix: "/image" })
  // Existing POST method
  .post("/generate", 
    async ({ body, set }) => {
      try {
        const response = await geminiService.generateImage(body);
        return { success: true, data: response };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      body: t.Object({
        model: t.Optional(t.String()),
        prompt: t.String(),
      }),
      detail: {
        tags: ["image"],
        summary: "Generate image",
        description: "Generate an image from Gemini image model based on the provided prompt"
      }
    }
  )
  // New GET method
  .get("/generate", 
    async ({ query, set }) => {
      try {
        const response = await geminiService.generateImage(query);
        return { success: true, data: response };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      query: t.Object({
        model: t.Optional(t.String()),
        prompt: t.String(),
      }),
      detail: {
        tags: ["image"],
        summary: "Generate image (GET)",
        description: "Generate an image from Gemini image model using query parameters"
      }
    }
  );