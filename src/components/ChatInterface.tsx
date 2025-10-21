import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Mic,
  UserCog,
  Smile,
  Bot,
  User as UserIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  profile?: {
    name: string;
    age: number;
    email: string;
    phone: string;
    address?: string;
    notes?: string;
  };
}

import { API_ENDPOINTS } from "@/config/api";

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll chat to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🟢 handleSend now accepts a custom message
  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || input;

    if (!messageToSend.trim() || isLoading) return;

    if (!chatStarted) {
      setChatStarted(true);
      setMessages([
        {
          id: "welcome",
          content:
            "✨ Hello! I'm RAMA AI, your intelligent assistant. How can I help you today?",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_ENDPOINTS.CHAT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend }),
      });

      const data = await res.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.reply || "I couldn't find an answer.",
        profile: data.profile || undefined,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          content: "⚠️ Error: Failed to connect to backend.",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech recognition setup
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  const handleVoiceInput = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎙️ Listening...");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("🎤 Recognized:", transcript);
      setInput(transcript);

      // 🔥 Send the recognized text directly
      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white px-4 relative overflow-hidden">
      {/* Background gradient blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30 blur-3xl opacity-40 pointer-events-none" />

      <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 drop-shadow-md">
        What can I help with?
      </h1>

      {!chatStarted ? (
        <div className="flex items-center w-[600px] max-w-full bg-[#1e1e1e]/70 backdrop-blur-lg border border-gray-800 rounded-full px-4 py-2 shadow-xl hover:shadow-purple-700/20 transition">
          <span className="text-gray-400 mr-2">+</span>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-400"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            onClick={handleVoiceInput}
            variant="ghost"
            size="icon"
            className={cn(
              "transition",
              isListening
                ? "text-green-400 animate-pulse"
                : "text-gray-400 hover:text-purple-400"
            )}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-purple-400 transition"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <>
          {/* Chat messages */}
          <div className="flex-1 w-full max-w-2xl overflow-y-auto p-4 bg-[#0a0a0a]/80 backdrop-blur-lg rounded-2xl mb-6 space-y-6 border border-gray-800 shadow-xl">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 max-w-3xl",
                  message.role === "user" ? "ml-auto" : ""
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-xl text-sm leading-relaxed shadow-md",
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a] border border-purple-800/40"
                      : "bg-gradient-to-br from-purple-600/80 to-blue-600/80 text-white border border-purple-500/30 ml-auto"
                  )}
                >
                  {message.content}

                  {/* Profile details if present */}
                  {message.profile && (
                    <div className="mt-3 p-3 rounded-xl bg-black/40 border border-gray-700/50 shadow-inner">
                      <h4 className="font-semibold mb-1 text-purple-300">
                        {message.profile.name}
                      </h4>
                      <p><strong>Age:</strong> {message.profile.age}</p>
                      <p><strong>Email:</strong> {message.profile.email}</p>
                      <p><strong>Phone:</strong> {message.profile.phone}</p>
                      {message.profile.address && (
                        <p><strong>Address:</strong> {message.profile.address}</p>
                      )}
                      {message.profile.notes && (
                        <p><strong>Notes:</strong> {message.profile.notes}</p>
                      )}
                    </div>
                  )}

                  <span className="text-xs opacity-60 mt-2 block text-right">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-[#1e1e1e]/80 rounded-2xl px-4 py-3 border border-purple-800/40 shadow-inner">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex items-center w-[600px] max-w-full bg-[#1e1e1e]/70 backdrop-blur-lg rounded-full px-4 py-2 shadow-xl border border-gray-800 hover:shadow-purple-700/20 transition">
            <span className="text-gray-400 mr-2">+</span>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-400"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
            />
            <Button
              onClick={handleVoiceInput}
              variant="ghost"
              size="icon"
              className={cn(
                "transition",
                isListening
                  ? "text-green-400 animate-pulse"
                  : "text-gray-400 hover:text-purple-400"
              )}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-purple-400 transition"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </>
      )}

      {/* Navigation cards */}
      
        

        
      
    </div>
  );
};



{/* Navigation cards.......................... */}