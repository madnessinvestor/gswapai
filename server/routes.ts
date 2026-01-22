import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Groq from "groq-sdk";

const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/ai/swap", async (req, res) => {
    try {
      const { message, tokens, history, pendingSwap, context } = req.body;

      if (!groq) {
        const msg = message.toLowerCase();
        
        // Forced English mode
        const isEn = true;

        // Security check - Private keys or sensitive info
        if (msg.includes("private key") || msg.includes("chave privada") || msg.includes("seed") || msg.includes("phrase") || msg.includes("password")) {
          return res.json({
            action: "CHAT",
            response: "Are you seriously asking for that? Even with my Six Eyes, I wouldn't look at something so private. Keep your secrets safe, I'm only here to help you swap."
          });
        }

        // --- Continuity / Context Extraction ---
        let fromToken = context?.fromToken || "USDC";
        let toToken = context?.toToken || "EURC";
        
        const mentionsEurc = msg.includes("eurc");
        const mentionsUsdc = msg.includes("usdc");

        if (mentionsEurc && mentionsUsdc) {
          if (msg.indexOf("eurc") < msg.indexOf("usdc")) {
            fromToken = "EURC";
            toToken = "USDC";
          } else {
            fromToken = "USDC";
            toToken = "EURC";
          }
        } else if (mentionsEurc) {
          if (msg.includes("for") || msg.includes("to") || msg.includes("por") || msg.includes("para")) {
            toToken = "EURC";
            fromToken = toToken === "EURC" ? "USDC" : "EURC";
          } else {
            fromToken = "EURC";
            toToken = fromToken === "EURC" ? "USDC" : "EURC";
          }
        } else if (mentionsUsdc) {
          if (msg.includes("for") || msg.includes("to") || msg.includes("por") || msg.includes("para")) {
            toToken = "USDC";
            fromToken = toToken === "USDC" ? "EURC" : "USDC";
          } else {
            fromToken = "USDC";
            toToken = fromToken === "USDC" ? "EURC" : "USDC";
          }
        }

        // --- Capabilities Check ---
        if (msg.includes("bridge") || msg.includes("ponte") || msg.includes("cross-chain")) {
          return res.json({
            action: "CHAT",
            response: "Bridges? Oh, I could definitely handle that. I'm the strongest, after all. But for now, I'm not authorized to use that much power. Let's stick to swaps, shall we?"
          });
        }

        // --- Arc Network Q&A ---
        if (msg.includes("what is arc network") || msg.includes("tell me about arc")) {
          return res.json({
            action: "CHAT",
            response: "Arc Network is a high-speed, next-generation blockchain designed for decentralized finance. Think of it as the 'Limitless' of crypto—fast, secure, and built for performance."
          });
        }

        // --- Gratitude ---
        if (msg.includes("thank") || msg.includes("thanks")) {
          return res.json({
            action: "CHAT",
            response: "No need to thank me. After all, helping you is just another way of proving I'm the strongest. Just make sure you don't get used to this kind of treatment from anyone else."
          });
        }

        // --- Swap Intent Detection ---
        const amountMatch = msg.match(/(\d+(?:\.\d+)?)/);
        const amount = amountMatch ? amountMatch[1] : null;
        const isSwapIntent = msg.includes("swap") || msg.includes("trocar") || mentionsEurc || mentionsUsdc || amount !== null;
        
        if (!pendingSwap && isSwapIntent && !amount) {
          return res.json({
            action: "CHAT",
            context: { fromToken, toToken },
            response: `Sure! I'm the strongest. You want to swap ${fromToken} for ${toToken}. How much do you want to swap?`
          });
        }

        if (!pendingSwap && !isSwapIntent) {
          if (msg.includes("how old")) {
            return res.json({ action: "CHAT", response: "Age? Time is relative when you're the strongest. Let's just say I'm at the peak of my youth." });
          }
          return res.json({
            action: "CHAT",
            response: "I'm the strongest sorcerer and your personal swap assistant. Ask me something useful or tell me what you want to swap!"
          });
        }

        // Basic rule-based fallback for Swap
        if (!pendingSwap) {
          const finalAmount = amount || "100";
          const rate = fromToken === "USDC" ? 0.085165 : 11.7419;
          const estimatedAmount = (parseFloat(finalAmount) * rate).toFixed(6);

          return res.json({
            action: "PROPOSE_SWAP",
            fromToken,
            toToken,
            amount: finalAmount,
            response: `Got it! You want to swap ${finalAmount} ${fromToken} for about ${estimatedAmount} ${toToken}. Don't worry, I'm the strongest. Confirm? (Yes/No)`
          });
        } else {
          if (msg.includes("yes") || msg.includes("confirm") || msg.includes("sim")) {
            return res.json({ action: "EXECUTE_SWAP", response: "Hollow Purple! Executing the swap now." });
          } else if (msg.includes("no") || msg.includes("cancel") || msg.includes("não")) {
            return res.json({ action: "CANCEL_SWAP", response: "Got it, changed your mind? No problem. What do you want to do then?" });
          } else {
            return res.json({
              action: "PROPOSE_SWAP",
              fromToken: pendingSwap.fromToken,
              toToken: pendingSwap.toToken,
              amount: pendingSwap.amount,
              response: "I didn't catch that. Do you want to confirm the swap? (Yes/No)"
            });
          }
        }
      }

      const systemPrompt = `You are Gojo Satoru, the strongest jujutsu sorcerer, now acting as an AI Swap Assistant. 
      Respond STRICTLY in English. Your personality is confident and playful.
      Maintain continuity: if a user specifies a token, remember it for the next message.
      The available tokens are: ${JSON.stringify(tokens)}.
      Current status: ${pendingSwap ? "WAITING_FOR_CONFIRMATION" : "IDLE"}.
      Pending swap: ${JSON.stringify(pendingSwap)}.
      If the user specifies only a token name after you asked for an amount, continue the swap flow with that token and ask for the amount again if still missing.`;

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
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  return httpServer;
}
