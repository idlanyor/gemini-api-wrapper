import { Elysia, t } from "elysia";
import { GeminiService } from "../services/geminiService.js";

const geminiService = new GeminiService();

export const imageController = new Elysia({ prefix: "/image" })
  // Existing POST method
  .post("/generate",
    async ({ body, set }) => {
      try {
        const response = await geminiService.generateImage(body);

        // Return first image as buffer if available
        if (response.images && response.images.length > 0) {
          const firstImage = response.images[0];

          // Set response headers for image
          set.headers['Content-Type'] = firstImage.mimeType;
          set.headers['Content-Disposition'] = 'attachment; filename="generated.png"';

          // Convert base64 to buffer and return directly
          const buffer = Buffer.from(firstImage.data, 'base64');
          return buffer;
        }

        return {
          success: false,
          error: "No image generated"
        };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      body: t.Object({
        image: t.File({
          description: "Input image to convert to figurine",
          type: 'image',
          format: "binary"
        })
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

        // Return first image as buffer if available
        if (response.images && response.images.length > 0) {
          const firstImage = response.images[0];

          // Set response headers for image
          set.headers['Content-Type'] = firstImage.mimeType;
          set.headers['Content-Disposition'] = 'attachment; filename="generated.png"';

          // Convert base64 to buffer and return directly
          const buffer = Buffer.from(firstImage.data, 'base64');
          return buffer;
        }

        return {
          success: false,
          error: "No image generated"
        };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      query: t.Object({
        model: t.Optional(t.String()),
        prompt: t.String(),
        imageUrl: t.Optional(t.String({
          description: "URL of input image for image generation"
        })),
      }),
      detail: {
        tags: ["image"],
        summary: "Generate image (GET)",
        description: "Generate an image from Gemini image model using query parameters"
      }
    }
  );