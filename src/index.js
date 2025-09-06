import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { staticPlugin } from "@elysiajs/static";
import { chatController } from "./controllers/chatController.js";
import { imageController } from "./controllers/imageController.js";
import { figurineController } from "./controllers/figurineController.js";
import { config } from "./config.js";
import { hijabController } from './controllers/hijabController.js';
import { sdmtinggiController } from './controllers/sdmtinggiController.js';

const app = new Elysia()
  .use(swagger({
    path: "/docs",
    documentation: {
      info: {
        title: "Gemini API Wrapper",
        version: "1.0.0",
        description: "A simple wrapper for Google's Gemini API with chat, image generation, and figurine creation capabilities"
      },
      tags: [
        { name: "chat", description: "Chat endpoints" },
        { name: "image", description: "Image generation endpoints" },
        { name: "figurine", description: "Figurine generation endpoints" },
        { name: "hijab", description: "Hijab generation endpoints" },
        { name: "sdmtinggi", description: "Sdmtinggi generation endpoints" }

      ]
    }
  }))
  .use(staticPlugin({
    assets: "public",
    prefix: "/"
  }))
  .get("/", () => {
    return {
      message: "Welcome to Gemini API Wrapper",
      version: "1.0.0",
      endpoints: {
        chat: {
          post: "/chat - Generate chat response",
          get: "/chat?message=hello - Generate chat response via GET",
          upload: "/chat/upload - Generate chat response with file",
          withFile: "/chat/with-file?message=hello&fileUrl=url - Chat with file URL"
        },
        image: {
          post: "/image/generate - Generate image from prompt",
          get: "/image/generate?prompt=hello - Generate image via GET"
        },
        figurine: {
          post: "/figurine - Generate figurine from uploaded image",
          get: "/figurine?imageUrl=url - Generate figurine from image URL"
        },
        hijab: {
          post: "/hijabkan - Generate hijab from uploaded image",
          get: "/hijabkan?imageUrl=url - Generate hijab from image URL"
        },
        sdmtinggi: {
          post: "/sdmtinggi - Generate sdmtinggi from uploaded image",
          get: "/sdmtinggi?imageUrl=url - Generate sdmtinggi from image URL"
        }


      },
      documentation: "/docs"
    };
  })
  .use(chatController)
  .use(imageController)
  .use(figurineController)
  .use(hijabController)
  .use(sdmtinggiController)

  .listen(config.port);

console.log(`🦊 Elysia is running at http://localhost:${config.port}`);
console.log(`📚 Swagger documentation available at http://localhost:${config.port}/docs`);
