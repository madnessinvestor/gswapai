import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Bot, User, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface AISwapAssistantProps {
  onSwapAction: (from: string, to: string, amount: string) => Promise<void>;
  tokens: any[];
}

export default function AISwapAssistant({ onSwapAction, tokens }: AISwapAssistantProps) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<any>(null);
  const [context, setContext] = useState<{ fromToken?: string; toToken?: string }>({});
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isExecutingSwap, setIsExecutingSwap] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setMessage(finalTranscript);
        } else if (interimTranscript) {
          setMessage(interimTranscript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        // Quando o reconhecimento terminar naturalmente (silêncio), 
        // mantemos o estado visual de "ouvindo" por mais 5 segundos
        // para dar tempo ao usuário de ver o que foi transcrito ou continuar falando
        setTimeout(() => {
          setIsListening(false);
        }, 5000);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setMessage("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

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
          pendingSwap,
          context
        }),
      });

      const data = await response.json();

      if (data.context) {
        setContext(data.context);
      }

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
          setIsExecutingSwap(true);
          const gojoQuotes = [
            "Throughout Heaven and Earth, I alone am the honored one.",
            "Domain Expansion: Infinite Void.",
            "Cursed Technique Reversal: Red.",
            "Cursed Technique Lapse: Blue.",
            "Imaginary Technique: Hollow Purple.",
            "Don't worry, I'm the strongest.",
            "It'll be fine. After all, you have me."
          ];
          const randomQuote = gojoQuotes[Math.floor(Math.random() * gojoQuotes.length)];
          setChat((prev) => [...prev, { role: "assistant", content: randomQuote }]);

          try {
            // Pass full token objects and ensure amount is correctly passed as a string
            // This should match the signature of handleSwapAction in SwapInterface
            await onSwapAction(fromTokenObj, toTokenObj, String(pendingSwap.amount));
          } catch (error: any) {
            console.error("Swap execution error:", error);
            // Se a transação falhar por saldo insuficiente ou cancelamento
            const errorMsg = error.message?.toLowerCase() || "";
            const isCancelled = errorMsg.includes("user rejected") || error.code === 4001 || errorMsg.includes("rejected");
            const isInsufficient = errorMsg.includes("insufficient funds") || errorMsg.includes("exceeds balance") || errorMsg.includes("insufficient");
            
            let status = "TRANSACTION_ERROR";
            if (isCancelled) status = "TRANSACTION_CANCELLED";
            else if (isInsufficient) status = "INSUFFICIENT_FUNDS";

            const feedbackResponse = await fetch("/api/ai/swap", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                status,
                tokens,
                history: chat,
                context
              }),
            });
            const feedbackData = await feedbackResponse.json();
            setChat((prev) => [...prev, { role: "assistant", content: feedbackData.response }]);
            setPendingSwap(null);
            setIsLoading(false);
            setIsExecutingSwap(false);
            return;
          } finally {
            setIsExecutingSwap(false);
          }
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
            data-testid="input-ai-message"
          />
          {speechSupported && (
            <Button 
              onClick={toggleListening} 
              disabled={isLoading} 
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              data-testid="button-voice-input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          <Button onClick={handleSend} disabled={isLoading} size="icon" data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
