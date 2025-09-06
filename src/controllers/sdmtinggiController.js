import { Elysia, t } from "elysia";
import { GeminiService } from "../services/geminiService.js";

const geminiService = new GeminiService();

export const sdmtinggiController = new Elysia({ prefix: "/sdmtinggi" })
    .post("/", async ({ body, set }) => {
        try {
            const result = await geminiService.generateSdmTinggi({
                image: body.image
            });

            // Return first image as buffer if available
            if (result.images && result.images.length > 0) {
                const firstImage = result.images[0];

                // Set response headers for image
                set.headers['Content-Type'] = firstImage.mimeType;
                set.headers['Content-Disposition'] = 'attachment; filename="sdmtinggi.png"';

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
                description: "Input image to convert to grayscale with censor bar and red background",
                type: "string",
                format: "binary"
            })
        }),
        detail: {
            tags: ["sdmtinggi"],
            summary: "Generate SdmTinggi from image",
            description: "Convert character to grayscale, add black censor bar on eyes, and replace background with red color - returns image buffer"
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

            const result = await geminiService.generateSdmTinggi({
                image: query.imageUrl
            });

            // Return first image as buffer if available
            if (result.images && result.images.length > 0) {
                const firstImage = result.images[0];

                // Set response headers for image
                set.headers['Content-Type'] = firstImage.mimeType;
                set.headers['Content-Disposition'] = 'attachment; filename="sdmtinggi.png"';

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
                description: "URL of the input image to convert to SdmTinggi style"
            })
        }),
        detail: {
            tags: ["sdmtinggi"],
            summary: "Generate SdmTinggi from image URL",
            description: "Convert character to grayscale, add black censor bar on eyes, and replace background with red color from URL - returns image buffer"
        }
    })