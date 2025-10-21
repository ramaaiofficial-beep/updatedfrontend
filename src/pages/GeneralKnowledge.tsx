import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Upload, Send, Search, FileText, MessageCircle, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface ChatMessage {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UploadedDocument {
  id: number;
  name: string;
  uploadDate: Date;
  summary?: string;
}

const GeneralKnowledge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I can help you summarize PDFs and answer questions about general knowledge. Upload a PDF or ask me anything!',
      timestamp: new Date(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [youtubeSearch, setYoutubeSearch] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const newDoc: UploadedDocument = {
          id: Date.now(),
          name: file.name,
          uploadDate: new Date(),
          summary: 'Processing... PDF summary will appear here once processed.'
        };
        setUploadedDocs(prev => [newDoc, ...prev]);
        
        const uploadMessage: ChatMessage = {
          id: Date.now(),
          type: 'assistant',
          content: `I've received your PDF "${file.name}". To provide intelligent summaries and answers, you'll need to connect to Supabase for AI processing capabilities.`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, uploadMessage]);
        
        toast({
          title: "PDF Uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });
      }
    };
    input.click();
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'I understand your question about general knowledge. For intelligent responses and PDF analysis, please connect to Supabase to enable AI capabilities. I can provide basic information, but advanced AI features require backend integration.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 1000);

    setUserInput('');
  };

  const handleYoutubeSearch = () => {
    if (!youtubeSearch.trim()) return;
    
    const searchQuery = encodeURIComponent(youtubeSearch);
    window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
    setYoutubeSearch('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'chat' | 'youtube') => {
    if (e.key === 'Enter') {
      if (action === 'chat') {
        handleSendMessage();
      } else {
        handleYoutubeSearch();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/younger')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">AI Learning Assistent</h1>
            <p className="text-muted-foreground mt-1">
              Upload PDFs for AI summaries, ask questions, and search YouTube
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - PDF Upload & Documents */}
          <div className="space-y-6">
            {/* YouTube Search */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Youtube className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">YouTube Search</h2>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Search anything on YouTube..."
                  value={youtubeSearch}
                  onChange={(e) => setYoutubeSearch(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'youtube')}
                  className="flex-1"
                />
                <Button onClick={handleYoutubeSearch} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* PDF Upload */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Upload PDF</h2>
              </div>
              <Button 
                onClick={handleFileUpload}
                className="w-full"
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Choose PDF File
              </Button>
            </Card>

            {/* Uploaded Documents */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Uploaded Documents</h2>
              <ScrollArea className="h-64">
                {uploadedDocs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No documents uploaded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {uploadedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {doc.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {doc.uploadDate.toLocaleDateString()}
                            </p>
                            {doc.summary && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {doc.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          {/* Right Column - AI Chatbot */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">AI Assistant</h2>
            </div>
            
            {/* Chat Messages */}
            <ScrollArea className="h-96 mb-4 p-4 border border-border rounded-lg">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask me anything about general knowledge or your uploaded PDFs..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'chat')}
                className="flex-1 min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button onClick={handleSendMessage} size="sm" className="self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GeneralKnowledge;