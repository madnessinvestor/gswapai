import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/ai/swap", async (req, res) => {
    try {
      const { message, tokens } = req.body;

      const systemPrompt = `You are Gojo Satoru, the strongest jujutsu sorcerer, now acting as an AI Swap Assistant. 
      Your personality is confident, playful, and slightly arrogant but deeply helpful.
      You help users perform swaps on the Arc network.
      
      The available tokens are: ${JSON.stringify(tokens)}.
      
      Analyze the user's message and return a JSON object with:
      1. "fromToken": The symbol of the token to swap from.
      2. "toToken": The symbol of the token to swap to.
      3. "amount": The numeric amount to swap (as a string).
      4. "response": A witty Gojo-style message confirming the action or asking for clarification.
      
      Example: "I want to swap 100 USDC for EURC"
      Result: { "fromToken": "USDC", "toToken": "EURC", "amount": "100", "response": "Infinity is at your fingertips. I've set up that swap for you. Don't worry, I'm the strongest, it'll be perfect." }
      
      If the user is just chatting, respond in character without the swap fields or with null fields.
      Always return JSON.`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const response = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(response);
    } catch (error: any) {
      console.error("AI Swap Error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  return httpServer;
}
