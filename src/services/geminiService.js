import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import fs from 'fs';
import path from 'path';

/**
 * @typedef {Object} ChatRequest
 * @property {string} [model] - Model to use for chat
 * @property {string} [sessionId] - Session ID for conversation continuity
 * @property {string} [systemPrompt] - System prompt for the chat
 * @property {string} message - The message to send
 * @property {File|string} [file] - Optional file attachment (File object or URL string)
 * @property {boolean} [useTools] - Whether to enable Google Search tools
 * @property {boolean} [useThinking] - Whether to enable thinking mode
 */

/**
 * @typedef {Object} ImageRequest
 * @property {string} [model] - Model to use for image generation
 * @property {string} prompt - The prompt for image generation
 */

export class GeminiService {
    constructor() {
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
        this.sessions = new Map();

        // Create images directory if it doesn't exist
        this.imagesDir = path.join(process.cwd(), 'public', 'images');
        if (!fs.existsSync(this.imagesDir)) {
            fs.mkdirSync(this.imagesDir, { recursive: true });
        }
    }

    /**
     * Fetch file from URL and convert to base64
     * @param {string} fileUrl - URL of the file
     * @returns {Promise<{data: string, mimeType: string}>} File data and mime type
     */
    async fetchFileFromUrl(fileUrl) {
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const mimeType = response.headers.get('content-type') || 'application/octet-stream';
            const base64Data = Buffer.from(arrayBuffer).toString('base64');

            return {
                data: base64Data,
                mimeType
            };
        } catch (error) {
            throw new Error(`Error fetching file from URL: ${error.message}`);
        }
    }

    /**
     * Generate chat response using streaming with tools and thinking config
     * @param {ChatRequest} request - Chat request parameters
     * @returns {Promise<Object>} Chat response
     */
    async generateChatResponse(request) {
        try {
            const {
                model = config.models.chat,
                sessionId,
                systemPrompt,
                message,
                file,
                useTools = false,
                useThinking = false
            } = request;

            // Prepare tools configuration
            const tools = useTools ? [
                {
                    googleSearch: {}
                },
            ] : undefined;

            // Prepare config
            const configOptions = {};

            if (useThinking) {
                configOptions.thinkingConfig = {
                    thinkingBudget: -1,
                };
            }

            if (tools) {
                configOptions.tools = tools;
            }

            // Prepare contents
            const parts = [{ text: message }];

            // Add file if provided
            if (file) {
                let fileData, mimeType;

                if (typeof file === 'string') {
                    // File is a URL
                    const urlFileData = await this.fetchFileFromUrl(file);
                    fileData = urlFileData.data;
                    mimeType = urlFileData.mimeType;
                } else {
                    // File is a File object
                    const arrayBuffer = await file.arrayBuffer();
                    fileData = Buffer.from(arrayBuffer).toString('base64');
                    mimeType = file.type;
                }

                parts.push({
                    inlineData: {
                        data: fileData,
                        mimeType
                    }
                });
            }

            // Add system prompt to contents if provided
            const contents = [];

            if (systemPrompt) {
                contents.push({
                    role: 'user',
                    parts: [{ text: systemPrompt }]
                });
            }

            contents.push({
                role: 'user',
                parts: parts,
            });

            // Use streaming response
            const response = await this.ai.models.generateContentStream({
                model,
                config: configOptions,
                contents,
            });

            let fullText = '';
            const chunks = [];

            for await (const chunk of response) {
                if (chunk.text) {
                    fullText += chunk.text;
                    chunks.push(chunk.text);
                }
            }

            return {
                text: fullText,
                chunks: chunks,
                sessionId: sessionId || null,
                usedTools: useTools,
                usedThinking: useThinking
            };
        } catch (error) {
            throw new Error(`Chat generation failed: ${error.message}`);
        }
    }

    /**
   * Save image to file system and return URL
   * @param {string} base64Data - Base64 image data
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<string>} File URL
   */
    async saveImageToFile(base64Data, mimeType) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const extension = mimeType.split('/')[1] || 'png';
            const filename = `generated_${timestamp}.${extension}`;
            const filepath = path.join(this.imagesDir, filename);

            // Convert base64 to buffer and save
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filepath, buffer);

            // Return URL path
            return `/images/${filename}`;
        } catch (error) {
            throw new Error(`Failed to save image: ${error.message}`);
        }
    }

    /**
     * Generate image using streaming response
     * @param {ImageRequest} request - Image generation request parameters
     * @returns {Promise<Object>} Image response with base64 data and text
     */
    async generateImage(request) {
        try {
            const { model = 'gemini-2.5-flash-image-preview', prompt } = request;

            const config = {
                responseModalities: [
                    'IMAGE',
                    'TEXT',
                ],
            };

            const contents = [
                {
                    role: 'user',
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ];

            const response = await this.ai.models.generateContentStream({
                model,
                config,
                contents,
            });

            const images = [];
            let textResponse = '';

            for await (const chunk of response) {
                if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
                    continue;
                }

                // Handle image data
                if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                    const inlineData = chunk.candidates[0].content.parts[0].inlineData;
                    images.push({
                        data: inlineData.data,
                        mimeType: inlineData.mimeType
                    });
                }
                // Handle text response
                else if (chunk.text) {
                    textResponse += chunk.text;
                }
            }

            return {
                images: images,
                text: textResponse,
                totalImages: images.length
            };
        } catch (error) {
            throw new Error(`Image generation failed: ${error.message}`);
        }
    }

    /**
     * Generate chat response without streaming
     * @param {ChatRequest} request - Chat request parameters
     * @returns {Promise<Object>} Chat response
     */
    async generateChatResponse(request) {
        try {
            const {
                model = config.models.chat,
                sessionId,
                systemPrompt,
                message,
                file,
                useTools = false,
                useThinking = false
            } = request;

            // Prepare tools configuration
            const tools = useTools ? [
                {
                    googleSearch: {}
                },
            ] : undefined;

            // Prepare config
            const configOptions = {};

            if (useThinking) {
                configOptions.thinkingConfig = {
                    thinkingBudget: -1,
                };
            }

            if (tools) {
                configOptions.tools = tools;
            }

            // Prepare contents
            const parts = [{ text: message }];

            // Add file if provided
            if (file) {
                let fileData, mimeType;

                if (typeof file === 'string') {
                    // File is a URL
                    const urlFileData = await this.fetchFileFromUrl(file);
                    fileData = urlFileData.data;
                    mimeType = urlFileData.mimeType;
                } else {
                    // File is a File object
                    const arrayBuffer = await file.arrayBuffer();
                    fileData = Buffer.from(arrayBuffer).toString('base64');
                    mimeType = file.type;
                }

                parts.push({
                    inlineData: {
                        data: fileData,
                        mimeType
                    }
                });
            }

            // Add system prompt to contents if provided
            const contents = [];

            if (systemPrompt) {
                contents.push({
                    role: 'user',
                    parts: [{ text: systemPrompt }]
                });
            }

            contents.push({
                role: 'user',
                parts: parts,
            });

            // Use non-streaming response
            const response = await this.ai.models.generateContent({
                model,
                config: configOptions,
                contents,
            });

            const text = response.text || '';

            return {
                text: text,
                sessionId: sessionId || null,
                usedTools: useTools,
                usedThinking: useThinking
            };
        } catch (error) {
            throw new Error(`Chat generation failed: ${error.message}`);
        }
    }

    /**
     * Generate image without streaming and save to file
     * @param {ImageRequest} request - Image generation request parameters
     * @returns {Promise<Object>} Image response with file URLs and text
     */
    async generateImage(request) {
        try {
            const { model = 'gemini-2.5-flash-image-preview', prompt } = request;

            const config = {
                responseModalities: [
                    'IMAGE',
                    'TEXT',
                ],
            };

            const contents = [
                {
                    role: 'user',
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ];



            // Use non-streaming response
            const response = await this.ai.models.generateContent({
                model,
                config,
                contents,
            });

            const images = [];
            let textResponse = '';

            // Handle response parts
            if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                const parts = response.candidates[0].content.parts;

                for (const part of parts) {
                    // Handle image data
                    if (part.inlineData) {
                        // Save image to file and get URL
                        const imageUrl = await this.saveImageToFile(part.inlineData.data, part.inlineData.mimeType);
                        images.push({
                            url: imageUrl,
                            mimeType: part.inlineData.mimeType
                        });
                    }
                    // Handle text response
                    else if (part.text) {
                        textResponse += part.text;
                    }
                }
            }

            return {
                images: images,
                text: textResponse,
                totalImages: images.length
            };
        } catch (error) {
            throw new Error(`Image generation failed: ${error.message}`);
        }
    }
    /**
   * Generate figurine image from input image (returns buffer)
   * @param {Object} request - To figure request parameters
   * @param {File|string} request.image - Input image (File object or URL string)
   * @param {string} [request.model] - Model to use for image generation
   * @returns {Promise<Object>} Figurine image response with buffer data
   */
  async generateFigurine(request) {
    try {
      const { image, model = 'gemini-2.5-flash-image-preview' } = request;
      
      const FIGURINE_PROMPT = 'Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. The computer screen shows the Zbrush modeling process of the figurine. Next to the computer screen is a BANDAI-style toy box with the original painting printed on it.';
      
      const config = {
        responseModalities: [
          'IMAGE',
          'TEXT',
        ],
      };
      
      // Prepare image data
      let imageData, mimeType;
      
      if (typeof image === 'string') {
        // Image is a URL
        const urlImageData = await this.fetchFileFromUrl(image);
        imageData = urlImageData.data;
        mimeType = urlImageData.mimeType;
      } else {
        // Image is a File object
        const arrayBuffer = await image.arrayBuffer();
        imageData = Buffer.from(arrayBuffer).toString('base64');
        mimeType = image.type;
      }
      
      const contents = [
        {
          role: 'user',
          parts: [
            { text: FIGURINE_PROMPT },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageData
              }
            }
          ],
        },
      ];

      // Use non-streaming response
      const response = await this.ai.models.generateContent({
        model,
        config,
        contents,
      });
      
      const images = [];
      let textResponse = '';
      
      // Handle response parts
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        const parts = response.candidates[0].content.parts;
        
        for (const part of parts) {
          // Handle image data - return as buffer instead of saving to file
          if (part.inlineData) {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            images.push({
              buffer: buffer,
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data // Keep base64 data for flexibility
            });
          }
          // Handle text response
          else if (part.text) {
            textResponse += part.text;
          }
        }
      }
      
      return {
        images: images,
        text: textResponse,
        totalImages: images.length,
        type: 'figurine'
      };
    } catch (error) {
      throw new Error(`Figurine generation failed: ${error.message}`);
    }
  }
  
  async generateHijab(request) {
    try {
      const { image, model = 'gemini-2.5-flash-image-preview' } = request;
      
      const HIJAB_PROMPT = 'Modify only the hair area by converting it into a neat, fully-covered white hijab in Indonesian Muslim style (100% no hair visible), while STRICTLY PRESERVING all other elements: do NOT alter skin color, clothing, facial features, pose, background, shadows, or any original details beyond the hair-to-hijab conversion—no additions/subtractions permitted.';
      
      const config = {
        responseModalities: [
          'IMAGE',
          'TEXT',
        ],
      };
      
      // Prepare image data
      let imageData, mimeType;
      
      if (typeof image === 'string') {
        // Image is a URL
        const urlImageData = await this.fetchFileFromUrl(image);
        imageData = urlImageData.data;
        mimeType = urlImageData.mimeType;
      } else {
        // Image is a File object
        const arrayBuffer = await image.arrayBuffer();
        imageData = Buffer.from(arrayBuffer).toString('base64');
        mimeType = image.type;
      }
      
      const contents = [
        {
          role: 'user',
          parts: [
            { text: HIJAB_PROMPT },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageData
              }
            }
          ],
        },
      ];

      // Use non-streaming response
      const response = await this.ai.models.generateContent({
        model,
        config,
        contents,
      });
      
      const images = [];
      let textResponse = '';
      
      // Handle response parts
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        const parts = response.candidates[0].content.parts;
        
        for (const part of parts) {
          // Handle image data - return as buffer instead of saving to file
          if (part.inlineData) {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            images.push({
              buffer: buffer,
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data 
            });
          }
          // Handle text response
          else if (part.text) {
            textResponse += part.text;
          }
        }
      }
      
      return {
        images: images,
        text: textResponse,
        totalImages: images.length,
        type: 'hijab'
      };
    } catch (error) {
      throw new Error(`Hijab generation failed: ${error.message}`);
    }
  }
  
  async generateSdmTinggi(request) {
    try {
      const { image, model = 'gemini-2.5-flash-image-preview' } = request;
      
      const SDMTINGGI_PROMPT = 'Edit the uploaded image by keeping the exact same character and anything they are holding without changing their pose, position, or appearance, convert only the character and held objects into grayscale with all visual details preserved (not fully white), add a clean solid black rectangular censor bar that precisely follows the orientation of the character\'s eyes and covers only the eyes, remove the entire original background completely and replace it with a flat solid pure red color (#FF0000), and make sure no parts of the character or the items they are holding are removed or replaced.';
      
      const config = {
        responseModalities: [
          'IMAGE',
          'TEXT',
        ],
      };
      
      // Prepare image data
      let imageData, mimeType;
      
      if (typeof image === 'string') {
        // Image is a URL
        const urlImageData = await this.fetchFileFromUrl(image);
        imageData = urlImageData.data;
        mimeType = urlImageData.mimeType;
      } else {
        // Image is a File object
        const arrayBuffer = await image.arrayBuffer();
        imageData = Buffer.from(arrayBuffer).toString('base64');
        mimeType = image.type;
      }
      
      const contents = [
        {
          role: 'user',
          parts: [
            { text: SDMTINGGI_PROMPT },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageData
              }
            }
          ],
        },
      ];

      // Use non-streaming response
      const response = await this.ai.models.generateContent({
        model,
        config,
        contents,
      });
      
      const images = [];
      let textResponse = '';
      
      // Handle response parts
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        const parts = response.candidates[0].content.parts;
        
        for (const part of parts) {
          // Handle image data - return as buffer instead of saving to file
          if (part.inlineData) {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            images.push({
              buffer: buffer,
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data // Keep base64 data for flexibility
            });
          }
          // Handle text response
          else if (part.text) {
            textResponse += part.text;
          }
        }
      }
      
      return {
        images: images,
        text: textResponse,
        totalImages: images.length,
        type: 'sdmtinggi'
      };
    } catch (error) {
      throw new Error(`SdmTinggi generation failed: ${error.message}`);
    }
  }
}

// const contoh = new GeminiService();
// contoh.generateChatResponse({
//   message: "Hello",
//   model: "gemini-2.5-flash",
//   sessionId: "user123",
//   systemPrompt: "You are a helpful assistant"
// }).then(console.log).catch(console.error);



