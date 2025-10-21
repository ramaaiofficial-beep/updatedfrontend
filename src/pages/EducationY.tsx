import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Search, Send, Paperclip, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  name: string;
  category: string;
  date: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const Education = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([
    { id: "1", name: "Cardiovascular Health Basics", category: "Cardiology", date: "15/1/2024" },
    { id: "2", name: "Nutrition and Diet Guidelines", category: "Nutrition", date: "10/1/2024" },
    { id: "3", name: "Mental Health and Wellness", category: "Psychology", date: "5/1/2024" },
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content: "Hello! I'm your health assistant. I can help you with questions about medicine, nutrition, mental health, and general wellness. How can I assist you today?",
      timestamp: "10:35 am"
    }
  ]);

  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileUpload = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      const newDoc: Document = {
        id: Date.now().toString(),
        name: file.name.replace(".pdf", ""),
        category: "Uploaded",
        date: new Date().toLocaleDateString("en-GB")
      };
      setDocuments([newDoc, ...documents]);
      toast({ title: "Success", description: "PDF uploaded successfully" });

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: `I've successfully processed your document "${file.name}". I can now answer questions about its contents, provide summaries, or help you understand specific topics from the document.`,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, assistantMessage]);
    } else {
      toast({ title: "Error", description: "Please upload a PDF file", variant: "destructive" });
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: messageInput,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, userMessage]);
    setMessageInput("");

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "I understand your question. This information is educational and should not replace professional advice.",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/younger")}
            className="mr-4 text-gray-400 hover:text-white hover:bg-[#1e1e1e]"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-white">Education Hub</h1>
            <p className="text-gray-400 mt-2">
              Access your notes and get instant help from our AI health assistant
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Medical Notes */}
          <Card className="p-6 bg-[#1e1e1e] border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Medical Notes & Textbooks</h2>
              <Button onClick={handleFileUpload} className="bg-gray-700 hover:bg-gray-600">
                <Upload className="w-4 h-4 mr-2" /> Upload
              </Button>
            </div>

            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="pl-10 bg-[#1e1e1e] border border-gray-800 text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredDocuments.map(doc => (
                <div key={doc.id} className="p-4 bg-[#1e1e1e] rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer">
                  <h3 className="font-semibold text-white mb-2">{doc.name}</h3>
                  <div className="flex justify-between items-center text-sm text-gray-400">
                    <span className="px-2 py-1 bg-gray-700 rounded-md">{doc.category}</span>
                    <span>{doc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Assistant */}
          <Card className="p-6 bg-[#1e1e1e] border border-gray-800 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">AI Health Assistant</h2>
              <span className="text-green-400">Online</span>
            </div>

            <div className="flex-1 space-y-4 mb-6 max-h-96 overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.type === 'user' ? 'bg-gray-700 text-white' : 'bg-[#1e1e1e] text-white'}`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-2">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex items-center gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-[#1e1e1e] border border-gray-800 text-white placeholder-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} className="bg-gray-700 hover:bg-gray-600">
                <Send className="w-4 h-4" />
              </Button>
              <Button variant="ghost" className="text-gray-400 hover:text-white">
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
