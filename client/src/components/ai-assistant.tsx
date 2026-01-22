import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AISwapAssistantProps {
  onSwapAction: (from: string, to: string, amount: string) => Promise<void>;
  tokens: any[];
}

export default function AISwapAssistant({ onSwapAction, tokens }: AISwapAssistantProps) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<any>(null);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    setChat((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage, 
          tokens,
          history: chat,
          pendingSwap 
        }),
      });

      const data = await response.json();

      if (data.action === "PROPOSE_SWAP") {
        setPendingSwap({
          from: data.fromToken,
          to: data.toToken,
          amount: data.amount
        });
      } else if (data.action === "EXECUTE_SWAP" && pendingSwap) {
        // Encontre os objetos de token completos a partir dos símbolos
        const fromTokenObj = tokens.find(t => t.symbol === pendingSwap.from);
        const toTokenObj = tokens.find(t => t.symbol === pendingSwap.to);
        
        if (fromTokenObj && toTokenObj) {
          await onSwapAction(fromTokenObj, toTokenObj, pendingSwap.amount);
        } else {
          console.error("Tokens not found for swap:", pendingSwap.from, pendingSwap.to);
          setChat((prev) => [...prev, { role: "assistant", content: "Não consegui encontrar os tokens para realizar a troca. Algo está errado no meu reino." }]);
        }
        setPendingSwap(null);
      } else if (data.action === "CANCEL_SWAP") {
        setPendingSwap(null);
      }

      setChat((prev) => [...prev, { role: "assistant", content: data.response || "Something went wrong, but I'm still the strongest." }]);
    } catch (error) {
      setChat((prev) => [...prev, { role: "assistant", content: "Even my Infinity has limits. Try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/20">
        <AnimatePresence initial={false}>
          {chat.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50">
              <Bot className="w-12 h-12" />
              <p className="text-sm">"Tell me what you want to swap. I'll handle the rest. After all, I'm the strongest."</p>
            </div>
          )}
          {chat.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-[#2d1b4d] text-foreground border border-primary/20 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#2d1b4d] text-foreground border border-primary/20 rounded-2xl rounded-tl-none px-4 py-2 text-sm">
                <span className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:0.2s]">.</span>
                  <span className="animate-bounce [animation-delay:0.4s]">.</span>
                </span>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-primary/10 bg-[#1c1038]/50">
        <div className="flex gap-2">
          <Input
            placeholder="Swap 10 USDC for EURC..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="bg-[#130b29] border-primary/20 focus:border-primary"
          />
          <Button onClick={handleSend} disabled={isLoading} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
