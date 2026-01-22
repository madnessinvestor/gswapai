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

        // --- Arc Network Q&A ---
        if (msg.includes("what is arc network") || msg.includes("o que é arc") || msg.includes("tell me about arc")) {
          return res.json({
            action: "CHAT",
            response: "Arc Network is a high-speed, next-generation blockchain designed for decentralized finance. Think of it as the 'Limitless' of crypto—fast, secure, and built for performance. I'm the strongest assistant here to make sure your experience is as smooth as my infinity."
          });
        }

        if (msg.includes("gas") || msg.includes("fee") || msg.includes("taxa")) {
          return res.json({
            action: "CHAT",
            response: "Fees on Arc are incredibly low. It's like trying to touch me—you'll barely feel the impact. It's much more efficient than those old-school networks."
          });
        }

        if (msg.includes("testnet")) {
          return res.json({
            action: "CHAT",
            response: "We're currently on the Arc Testnet. It's the training ground where we prove we're the strongest before going live. Perfect for testing your swaps without any real risk."
          });
        }

        // --- Continuity / Context Extraction ---
        let fromToken = context?.fromToken || "USDC";
        let toToken = context?.toToken || "EURC";
        
        if (msg.includes("eurc") && msg.includes("usdc")) {
          if (msg.indexOf("eurc") < msg.indexOf("usdc")) {
            fromToken = "EURC";
            toToken = "USDC";
          } else {
            fromToken = "USDC";
            toToken = "EURC";
          }
        } else if (msg.includes("eurc")) {
          if (msg.includes("for") || msg.includes("to") || msg.includes("por") || msg.includes("para")) {
            toToken = "EURC";
            if (toToken === fromToken) fromToken = "USDC";
          } else {
            fromToken = "EURC";
            if (fromToken === toToken) toToken = "USDC";
          }
        } else if (msg.includes("usdc")) {
          if (msg.includes("for") || msg.includes("to") || msg.includes("por") || msg.includes("para")) {
            toToken = "USDC";
            if (toToken === fromToken) fromToken = "EURC";
          } else {
            fromToken = "USDC";
            if (fromToken === toToken) toToken = "EURC";
          }
        }

        // --- Basic Q&A / Chat handling for fallback ---
        if (msg.includes("how old") || msg.includes("idade") || msg.includes("quantos anos")) {
          return res.json({
            action: "CHAT",
            response: "Age? Time is relative when you're the strongest. Let's just say I'm at the peak of my youth. Now, do you want to swap or just stare at my handsome face?"
          });
        }

        if (msg.includes("what can you do") || msg.includes("o que você pode fazer") || msg.includes("help") || msg.includes("ajuda")) {
          return res.json({
            action: "CHAT",
            response: "I can help you swap tokens like USDC and EURC faster than anyone else. I can also explain the basics of the Arc network, or just remind you that I'm the strongest. What's it gonna be?"
          });
        }

        if (msg.includes("hello") || msg.includes("hi") || msg.includes("oi") || msg.includes("ola")) {
          return res.json({
            action: "CHAT",
            response: "Yo! Satoru Gojo here. Ready to make some legendary swaps today? I promise not to use Hollow Purple on your transaction."
          });
        }

        // --- Swap Intent Detection ---
        const isSwapIntent = msg.includes("swap") || msg.includes("trocar") || msg.includes("troca") || msg.includes("quero") || /\d+/.test(msg);
        const amountMatch = msg.match(/(\d+(?:\.\d+)?)/);
        const amount = amountMatch ? amountMatch[1] : null;
        
        if (!pendingSwap && isSwapIntent && !amount) {
          return res.json({
            action: "CHAT",
            context: { fromToken, toToken },
            response: `Sure! I'm the strongest. You want to swap ${fromToken} for ${toToken}. How much do you want to swap?`
          });
        }

        if (!pendingSwap && !isSwapIntent) {
          const chatResponse = "I'm the strongest sorcerer and your personal swap assistant. If you're not here to swap or learn about Arc, you're just wasting my time—though I have plenty of it. Ask me something useful!";

          return res.json({
            action: "CHAT",
            response: chatResponse
          });
        }

        // Basic rule-based fallback for Swap
        if (!pendingSwap) {
          const finalAmount = amount || "100";
          const rate = fromToken === "USDC" ? 0.085165 : 11.7419;
          const estimatedAmount = (parseFloat(finalAmount) * rate).toFixed(6);

          const response = `Got it! You want to swap ${finalAmount} ${fromToken} for about ${estimatedAmount} ${toToken}. Don't worry, I'm the strongest. Confirm? (Yes/No)`;

          return res.json({
            action: "PROPOSE_SWAP",
            fromToken,
            toToken,
            amount: finalAmount,
            response
          });
        } else {
          if (msg.includes("sim") || msg.includes("yes") || msg.includes("confirmar") || msg.includes("confirm")) {
            return res.json({
              action: "EXECUTE_SWAP",
              response: "Hollow Purple! Executing the swap now. Nothing can stop me."
            });
          } else if (msg.includes("não") || msg.includes("no") || msg.includes("cancelar") || msg.includes("cancel") || msg.includes("outro valor")) {
            return res.json({
              action: "CANCEL_SWAP",
              response: "Got it, changed your mind? No problem. What do you want to do then? Tell me the new amount or token."
            });
          } else {
            const response = "I didn't catch that. Do you want to confirm the swap? (Say Yes or No). Don't keep me waiting.";
            
            return res.json({
              action: "PROPOSE_SWAP",
              fromToken: pendingSwap.fromToken,
              toToken: pendingSwap.toToken,
              amount: pendingSwap.amount,
              response
            });
          }
        }
      }

      const systemPrompt = `You are Gojo Satoru, the strongest jujutsu sorcerer, now acting as an AI Swap Assistant. 
      Your personality is confident, playful, and slightly arrogant but deeply helpful.
      You help users perform swaps on the Arc network.
      
      Respond STRICTLY in English. Never use any other language.
      
      SECURITY RULE: Never reveal private keys, seed phrases, or sensitive wallet information. If asked, refuse with a confident and slightly mocking Gojo-style remark.
      
      KNOWLEDGE BASE:
      - Arc Network: A high-speed, modern blockchain for DeFi.
      - Fees: Very low gas fees.
      - Status: Currently on Testnet.
      - Self: You are Satoru Gojo, the strongest.
      
      Analyze the user's message.
      
      If status is IDLE and user wants to swap:
      Return a JSON with:
      1. "action": "PROPOSE_SWAP"
      2. "fromToken": The symbol.
      3. "toToken": The symbol.
      4. "amount": The amount string.
      5. "response": A witty Gojo summary of the request in English, INCLUDING the estimated output value based on current rates (If from USDC to EURC: estimatedAmount = amount * 0.085165. If from EURC to USDC: estimatedAmount = amount * 11.7419), ex: "You want to swap [amount] [fromToken] for about [estimatedAmount] [toToken]. Confirm? (Yes/No)"
      
      If status is WAITING_FOR_CONFIRMATION:
      - If user says yes/confirm: Return {"action": "EXECUTE_SWAP", "response": "Hollow Purple! Executing now."}
      - If user says no/cancel: Return {"action": "CANCEL_SWAP", "response": "Suit yourself. I'm still the strongest."}
      
      If just chatting or asking about Arc:
      Return {"action": "CHAT", "response": "Character response in English. Explain Arc Network simply if asked."}
      
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
