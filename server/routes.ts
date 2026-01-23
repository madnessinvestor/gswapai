import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';

const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const gemini = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    public: { http: ['https://rpc.testnet.arc.network'] },
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
};

const publicClient = createPublicClient({
  chain: arcTestnet as any,
  transport: http()
});

const ROUTER_ADDRESS = "0x284C5Afc100ad14a458255075324fA0A9dfd66b1";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

const ROUTER_ABI = [
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }]
  }
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/ai/swap", async (req, res) => {
    try {
      const { message, tokens, history, pendingSwap, context, status } = req.body;

      if (status === "TRANSACTION_CANCELLED") {
        return res.json({
          action: "CHAT",
          response: "Tsk. You cancelled it? I guess even the strongest can have second thoughts. No problem, let me know if you want to try again."
        });
      }

      if (status === "INSUFFICIENT_FUNDS") {
        return res.json({
          action: "CHAT",
          response: "Your balance is as empty as the Void! You don't have enough tokens for this swap. Go get some more and come back."
        });
      }

      // Helper to get real on-chain quote
      const getOnChainQuote = async (amountIn: string, fromSym: string, toSym: string) => {
        try {
          const fromAddr = fromSym === "USDC" ? USDC_ADDRESS : EURC_ADDRESS;
          const toAddr = toSym === "USDC" ? USDC_ADDRESS : EURC_ADDRESS;
          
          // Use 6 decimals for both tokens as they are USDC and EURC (both 6 decimals)
          const amount = parseUnits(amountIn, 6);
          const amounts = await publicClient.readContract({
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [amount, [fromAddr, toAddr]]
          }) as bigint[];
          
          // O contrato retorna [amountIn, amountOut]
          // Format with 6 decimals for maximum precision matching the UI
          return formatUnits(amounts[1], 6);
        } catch (e) {
          console.error("Quote error:", e);
          const fallbackRate = fromSym === "USDC" ? 0.084118 : 11.888;
          return (parseFloat(amountIn) * fallbackRate).toFixed(6);
        }
      };

      const systemPrompt = `You are Gojo Satoru, the strongest jujutsu sorcerer. Respond STRICTLY in English.
      Use real pool data for estimates. If from USDC to EURC, the rate is fetched from the contract.
      The available tokens are: ${JSON.stringify(tokens)}.
      Current status: ${pendingSwap ? "WAITING_FOR_CONFIRMATION" : "IDLE"}.
      Pending swap: ${JSON.stringify(pendingSwap)}.
      Always return JSON with action and response. For PROPOSE_SWAP, include fromToken, toToken, and amount.
      Valid actions: CHAT, PROPOSE_SWAP, EXECUTE_SWAP, CANCEL_SWAP.`;

      let aiResponse: any = null;

      // Try Groq first
      if (groq) {
        try {
          const messages = [
            { role: "system" as const, content: systemPrompt },
            ...(history || []).slice(-5).map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
            { role: "user" as const, content: message }
          ];

          const completion = await groq.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
          });

          aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
          console.log("AI Response from Groq");
        } catch (groqError) {
          console.error("Groq error, trying Gemini:", groqError);
        }
      }

      // Fallback to Gemini if Groq failed or unavailable
      if (!aiResponse && gemini) {
        try {
          const model = gemini.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
            }
          });

          const historyForGemini = (history || []).slice(-5).map((h: any) => 
            `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`
          ).join("\n");

          const prompt = `${systemPrompt}\n\nConversation history:\n${historyForGemini}\n\nUser: ${message}\n\nRespond with valid JSON only.`;

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          aiResponse = JSON.parse(responseText);
          console.log("AI Response from Gemini");
        } catch (geminiError) {
          console.error("Gemini error:", geminiError);
        }
      }

      // Final fallback to simple rule-based responses
      if (!aiResponse) {
        const msg = message.toLowerCase();

        if (msg.includes("private key") || msg.includes("chave privada")) {
          return res.json({
            action: "CHAT",
            response: "Are you seriously asking for that? Even with my Six Eyes, I wouldn't look at something so private."
          });
        }

        let fromToken = context?.fromToken || "USDC";
        let toToken = context?.toToken || "EURC";
        
        if (msg.includes("eurc") && msg.includes("usdc")) {
          if (msg.indexOf("eurc") < msg.indexOf("usdc")) {
            fromToken = "EURC"; toToken = "USDC";
          } else {
            fromToken = "USDC"; toToken = "EURC";
          }
        } else if (msg.includes("eurc")) {
          if (msg.includes("for") || msg.includes("to")) { toToken = "EURC"; fromToken = "USDC"; }
          else { fromToken = "EURC"; toToken = "USDC"; }
        } else if (msg.includes("usdc")) {
          if (msg.includes("for") || msg.includes("to")) { toToken = "USDC"; fromToken = "EURC"; }
          else { fromToken = "USDC"; toToken = "EURC"; }
        }

        const amountMatch = msg.match(/(\d+(?:\.\d+)?)/);
        const amount = amountMatch ? amountMatch[1] : null;
        const isSwapIntent = msg.includes("swap") || msg.includes("trocar") || msg.includes("eurc") || msg.includes("usdc") || amount !== null;
        
        if (!pendingSwap && isSwapIntent && !amount) {
          return res.json({
            action: "CHAT",
            context: { fromToken, toToken },
            response: `Sure! I'm the strongest. You want to swap ${fromToken} for ${toToken}. How much do you want to swap?`
          });
        }

        if (!pendingSwap && !isSwapIntent) {
          const responses = [
            "You're welcome. But don't get too comfortable, I'm the strongest after all.",
            "No need for thanks. Just sit back and watch how the strongest does it.",
            "Don't thank me. It's only natural for me to be this perfect.",
            "Yo! No problem. Just make sure you keep up with my speed."
          ];
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];

          if (msg.includes("thank") || msg.includes("obrigado") || msg.includes("valeu")) {
            return res.json({ action: "CHAT", response: randomResponse });
          }

          return res.json({ action: "CHAT", response: "I'm the strongest sorcerer and your personal swap assistant. Ask me something useful!" });
        }

        if (!pendingSwap) {
          const finalAmount = amount || "100";
          const estimatedAmount = await getOnChainQuote(finalAmount, fromToken, toToken);

          return res.json({
            action: "PROPOSE_SWAP",
            fromToken,
            toToken,
            amount: finalAmount,
            response: `Got it! You want to swap ${finalAmount} ${fromToken} for about ${estimatedAmount} ${toToken} (directly from the pool). Confirm? (Yes/No)`
          });
        } else {
          if (msg.includes("yes") || msg.includes("confirm")) {
            return res.json({ action: "EXECUTE_SWAP", response: "Hollow Purple! Executing the swap now." });
          } else if (msg.includes("no") || msg.includes("cancel")) {
            return res.json({ action: "CANCEL_SWAP", response: "Got it, changed your mind? No problem." });
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
      
      if (aiResponse.action === "PROPOSE_SWAP") {
        aiResponse.estimatedAmount = await getOnChainQuote(aiResponse.amount, aiResponse.fromToken, aiResponse.toToken);
        aiResponse.response = `You want to swap ${aiResponse.amount} ${aiResponse.fromToken} for about ${aiResponse.estimatedAmount} ${aiResponse.toToken}. Confirm? (Yes/No)`;
      }

      res.json(aiResponse);
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  return httpServer;
}
