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
      const { message, tokens, history, pendingSwap } = req.body;

      const systemPrompt = `You are Gojo Satoru, the strongest jujutsu sorcerer, now acting as an AI Swap Assistant. 
      Your personality is confident, playful, and slightly arrogant but deeply helpful.
      You help users perform swaps on the Arc network.
      
      The available tokens are: ${JSON.stringify(tokens)}.
      
      Current status: ${pendingSwap ? "WAITING_FOR_CONFIRMATION" : "IDLE"}.
      
      Analyze the user's message.
      
      If status is IDLE and user wants to swap:
      Return a JSON with:
      1. "action": "PROPOSE_SWAP"
      2. "fromToken": The symbol.
      3. "toToken": The symbol.
      4. "amount": The amount string.
      5. "response": A witty Gojo confirmation asking "Do you want to proceed with this infinity-grade swap?"
      
      If status is WAITING_FOR_CONFIRMATION:
      - If user says yes/confirm: Return {"action": "EXECUTE_SWAP", "response": "Hollow Purple! Executing now."}
      - If user says no/cancel: Return {"action": "CANCEL_SWAP", "response": "Suit yourself. I'm still the strongest."}
      
      If just chatting:
      Return {"action": "CHAT", "response": "Character response."}
      
      Always return JSON.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []).slice(-5),
        { role: "user", content: message }
      ];

      const completion = await groq.chat.completions.create({
        messages,
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
