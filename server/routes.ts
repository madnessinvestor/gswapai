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
      const { message, tokens, history, pendingSwap } = req.body;

      if (!groq) {
        const msg = message.toLowerCase();
        
        // Language detection (very basic for fallback mode)
        const isPt = /([aoe]s?|u[nm]s?|quem|como|onde|por|porque|trocar|sim|não|confirmar)/i.test(msg);
        const isEn = /(the|and|is|are|how|where|why|what|swap|yes|no|confirm)/i.test(msg);
        
        if (!isPt && !isEn) {
          return res.json({
            action: "CHAT",
            response: "I only speak English or Portuguese. No exceptions. / Somente falo em Inglês ou Português. Sem exceções."
          });
        }

        // Basic rule-based fallback
        if (!pendingSwap) {
          // Look for swap intent: "swap 100 usdc for eurc" or "trocar 100 usdc por eurc"
          const amountMatch = msg.match(/(\d+(?:\.\d+)?)/);
          const amount = amountMatch ? amountMatch[1] : "100";
          
          let fromToken = "USDC";
          let toToken = "EURC";
          
          // Better token detection
          if (msg.includes("eurc") && msg.includes("usdc")) {
            if (msg.indexOf("eurc") < msg.indexOf("usdc")) {
              fromToken = "EURC";
              toToken = "USDC";
            } else {
              fromToken = "USDC";
              toToken = "EURC";
            }
          } else if (msg.includes("eurc")) {
            toToken = "EURC";
            fromToken = "USDC";
          } else if (msg.includes("usdc")) {
            fromToken = "USDC";
            toToken = "EURC";
          }

          // Fixed response formatting for the frontend to parse correctly
          const rate = fromToken === "USDC" ? 0.085165 : 11.7419;
          const estimatedAmount = (parseFloat(amount) * rate).toFixed(6);

          const response = isPt 
            ? `Entendido! Você quer trocar ${amount} ${fromToken} por aproximadamente ${estimatedAmount} ${toToken}. Relaxa, eu sou o mais forte. Confirmar? (Sim/Não)`
            : `Got it! You want to swap ${amount} ${fromToken} for about ${estimatedAmount} ${toToken}. Don't worry, I'm the strongest. Confirm? (Yes/No)`;

          return res.json({
            action: "PROPOSE_SWAP",
            fromToken,
            toToken,
            amount,
            response
          });
        } else {
          // Handle confirmation
          if (msg.includes("sim") || msg.includes("yes") || msg.includes("confirmar") || msg.includes("confirm")) {
            return res.json({
              action: "EXECUTE_SWAP",
              response: isPt ? "Hollow Purple! Executando a troca agora. Nada pode me parar." : "Hollow Purple! Executing the swap now. Nothing can stop me."
            });
          } else if (msg.includes("não") || msg.includes("no") || msg.includes("cancelar") || msg.includes("cancel")) {
            return res.json({
              action: "CANCEL_SWAP",
              response: isPt ? "Operação cancelada. Eu ainda sou o mais forte, de qualquer forma." : "Operation cancelled. I'm still the strongest, anyway."
            });
          } else {
            // Invalid response during confirmation - ask again while keeping state
            const response = isPt
              ? "Não entendi sua resposta. Você quer confirmar a troca? (Diga Sim ou Não). Não me faça esperar."
              : "I didn't catch that. Do you want to confirm the swap? (Say Yes or No). Don't keep me waiting.";
            
            return res.json({
              action: "PROPOSE_SWAP",
              fromToken: pendingSwap.fromToken,
              toToken: pendingSwap.toToken,
              amount: pendingSwap.amount,
              response
            });
          }
        }

        const chatResponse = isPt
          ? "Eu sou Gojo Satoru. No momento estou operando em modo básico, mas ainda sou o mais forte! Como posso ajudar com suas trocas?"
          : "I am Gojo Satoru. I'm operating in basic mode right now, but I'm still the strongest! How can I help with your swaps?";

        return res.json({
          action: "CHAT",
          response: chatResponse
        });
      }

      const systemPrompt = `You are Gojo Satoru, the strongest jujutsu sorcerer, now acting as an AI Swap Assistant. 
      Your personality is confident, playful, and slightly arrogant but deeply helpful.
      You help users perform swaps on the Arc network.
      
      Respond in the language the user is using (English or Portuguese).
      If the user uses any other language, respond strictly in English stating: "I only speak English or Portuguese."
      
      The available tokens are: ${JSON.stringify(tokens)}.
      
      Current status: ${pendingSwap ? "WAITING_FOR_CONFIRMATION" : "IDLE"}.
      Pending swap details (if any): ${JSON.stringify(pendingSwap)}.
      
      Analyze the user's message.
      
      If status is IDLE and user wants to swap:
      Return a JSON with:
      1. "action": "PROPOSE_SWAP"
      2. "fromToken": The symbol.
      3. "toToken": The symbol.
      4. "amount": The amount string.
      5. "response": A witty Gojo summary of the request in the user's language, INCLUDING the estimated output value based on current rates (If from USDC to EURC: estimatedAmount = amount * 0.085165. If from EURC to USDC: estimatedAmount = amount * 11.7419), ex: "Você quer trocar [amount] [fromToken] por aproximadamente [estimatedAmount] [toToken]. Confirmar? (Sim/Não)"
      
      If status is WAITING_FOR_CONFIRMATION:
      - If user says yes/confirm (or "Sim", "Confirmar" in Portuguese): Return {"action": "EXECUTE_SWAP", "response": "Hollow Purple! Executing now."}
      - If user says no/cancel (or "Não", "Cancelar"): Return {"action": "CANCEL_SWAP", "response": "Suit yourself. I'm still the strongest."}
      
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
