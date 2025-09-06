export const config = {
  apiKey: process.env.GEMINI_API_KEY || '',
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  models: {
    chat: 'gemini-2.5-flash',
    image: 'gemini-2.5-flash-image-preview' // Updated model
  }
};