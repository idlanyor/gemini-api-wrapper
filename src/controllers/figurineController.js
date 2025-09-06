import { Elysia, t } from "elysia";
import { GeminiService } from "../services/geminiService.js";

const geminiService = new GeminiService();

export const figurineController = new Elysia({ prefix: "/figurine" })
  .post("/", async ({ body, set }) => {
    try {
      const result = await geminiService.generateFigurine({
        image: body.image
      });
      
      // Return first image as buffer if available
      if (result.images && result.images.length > 0) {
        const firstImage = result.images[0];
        
        // Set response headers for image
        set.headers['Content-Type'] = firstImage.mimeType;
        set.headers['Content-Disposition'] = 'attachment; filename="figurine.png"';
        
        // Return buffer directly
        return firstImage.buffer;
      }
      
      return {
        success: false,
        error: "No image generated"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }, {
    body: t.Object({
      image: t.File({
        description: "Input image to convert to figurine",
        type: "string",
        format: "binary"
      })
    }),
    detail: {
      tags: ["figurine"],
      summary: "Generate figurine from image",
      description: "Convert an input image into a realistic figurine using AI - returns image buffer"
    }
  })
  .get("/", async ({ query, set }) => {
    try {
      if (!query.imageUrl) {
        return {
          success: false,
          error: "imageUrl parameter is required"
        };
      }
      
      const result = await geminiService.generateFigurine({
        image: query.imageUrl
      });
      
      // Return first image as buffer if available
      if (result.images && result.images.length > 0) {
        const firstImage = result.images[0];
        
        // Set response headers for image
        set.headers['Content-Type'] = firstImage.mimeType;
        set.headers['Content-Disposition'] = 'attachment; filename="figurine.png"';
        
        // Return buffer directly
        return firstImage.buffer;
      }
      
      return {
        success: false,
        error: "No image generated"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }, {
    query: t.Object({
      imageUrl: t.String({
        description: "URL of the input image to convert to figurine"
      })
    }),
    detail: {
      tags: ["figurine"],
      summary: "Generate figurine from image URL",
      description: "Convert an input image from URL into a realistic figurine using AI - returns image buffer"
    }
  })
