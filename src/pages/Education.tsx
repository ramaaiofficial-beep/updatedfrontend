import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Search, Send, Mic, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";

interface Document {
  id: string;
  name: string;
  category: string;
  date: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
}

const getCurrentTimestamp = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const generateId = () => Date.now().toString();

const Education = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const medicalInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const songInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      type: "assistant",
      content:
        "Hello! I'm your health assistant. Upload a PDF and ask me anything about it.",
      timestamp: getCurrentTimestamp(),
    },
  ]);

  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // audio player
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [currentSongName, setCurrentSongName] = useState<string | null>(null);

  // -------------------- File Upload Handlers --------------------
  const handleFileUpload = (ref: React.RefObject<HTMLInputElement>) =>
    ref.current?.click();

  const uploadFile = async (file: File, category: string) => {
    if (category === "songs" && !["audio/mpeg", "audio/mp3"].includes(file.type)) {
      toast({
        title: "Error",
        description: "Only MP3 files are accepted.",
        variant: "destructive",
      });
      return;
    }
    if ((category === "medical" || category === "stories") && file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Only PDF files are accepted.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_ENDPOINTS.EDUCATION_UPLOAD}/${category}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const newDoc: Document = {
        id: generateId(),
        name: file.name,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        date: new Date().toLocaleDateString("en-GB"),
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setCurrentFile(file.name);

      toast({ title: "Success", description: data.message });

      const assistantMessage: ChatMessage = {
        id: generateId(),
        type: "assistant",
        content:
          category === "songs"
            ? `I've processed your song file "${file.name}".`
            : `I've processed your ${category} file "${file.name}". You can now ask me questions about it.`,
        timestamp: getCurrentTimestamp(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      toast({
        title: "Error",
        description: "Failed to upload file.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (category: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadFile(file, category);
  };

  // -------------------- Sending a message/question --------------------
  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || messageInput;
    if (!messageToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      type: "user",
      content: messageToSend,
      timestamp: getCurrentTimestamp(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch(
        `${API_ENDPOINTS.EDUCATION_ASK}?question=${encodeURIComponent(
          messageToSend
        )}${currentFile ? `&filename=${encodeURIComponent(currentFile)}` : ""}`
      );
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      // If song returned
      if (data.song_url) {
        const fullUrl = `${API_ENDPOINTS.EDUCATION_ASK.replace('/education/ask', '')}${data.song_url}`;
        setCurrentSongUrl(fullUrl);

        // Extract the filename from URL
        const params = new URLSearchParams(fullUrl.split("?")[1]);
        const fileParam = params.get("filename");
        setCurrentSongName(fileParam || "Song");

        // Auto-play after reloading source
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().catch(() => {});
          }
        }, 300);
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        type: "assistant",
        content: data.answer || "Sorry, I couldn't find an answer.",
        timestamp: getCurrentTimestamp(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: generateId(),
        type: "assistant",
        content: "Failed to connect to the server.",
        timestamp: getCurrentTimestamp(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setMessageInput("");
  };

  // -------------------- Voice Input --------------------
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Error",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessageInput(transcript);
      handleSendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      toast({
        title: "Voice Error",
        description: event.error || "Something went wrong with voice input.",
        variant: "destructive",
      });
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // -------------------- Render --------------------
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/elders")}
            aria-label="Go back"
            className="mr-4 text-gray-400 hover:text-white hover:bg-[#1e1e1e]"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-white">Health Assistent</h1>
            <p className="text-gray-400 mt-2">
              Access your medical history get instant help from our AI assistant
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Sections */}
          <Card className="p-6 bg-[#1e1e1e] border border-gray-800 space-y-6">
            {/* Medical */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Medical Documents</h2>
                <Button
                  onClick={() => handleFileUpload(medicalInputRef)}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload
                </Button>
              </div>
              <input
                ref={medicalInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange("medical", e)}
                className="hidden"
              />
            </div>

            

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="pl-10 bg-[#1e1e1e] border border-gray-800 text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => doc.category !== "Songs" && setCurrentFile(doc.name)}
                    className={`p-4 rounded-lg border cursor-pointer ${
                      currentFile === doc.name
                        ? "bg-blue-900 border-blue-600"
                        : "bg-[#1e1e1e] border-gray-700 hover:bg-gray-800"
                    }`}
                  >
                    <h3 className="font-semibold text-white mb-2">{doc.name}</h3>
                    <div className="flex justify-between items-center text-sm text-gray-400">
                      <span className="px-2 py-1 bg-gray-700 rounded-md">{doc.category}</span>
                      <span>{doc.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">No files found.</p>
              )}
            </div>
          </Card>

          {/* Assistant */}
          <Card className="p-6 bg-[#1e1e1e] border border-gray-800 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">AI Health Assistant</h2>
              <span className="text-green-400">Online</span>
            </div>

            <div
              className="flex-1 space-y-4 mb-6 max-h-96 overflow-y-auto"
              role="log"
              aria-live="polite"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      msg.type === "user"
                        ? "bg-gray-700 text-white"
                        : "bg-[#1e1e1e] text-white"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-2">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Song player */}
            {currentSongUrl && (
              <div className="mb-4 p-3 rounded-lg bg-gray-800 flex items-center gap-3">
                <Music className="w-5 h-5 text-green-400" />
                <span className="text-sm flex-1">{currentSongName}</span>
                <audio ref={audioRef} controls src={currentSongUrl} className="w-40" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-[#1e1e1e] border border-gray-800 text-white placeholder-gray-400"
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button onClick={() => handleSendMessage()} className="bg-gray-700 hover:bg-gray-600">
                <Send className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                className={`${
                  isListening ? "text-green-400 animate-pulse" : "text-gray-400 hover:text-white"
                }`}
                onClick={handleVoiceInput}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Education;
