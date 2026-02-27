import { useState, useRef, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles, Camera, Leaf } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI farming assistant. Ask me anything about plants, diseases, fertilizers, pest control, soil health, or farming techniques. I'm here to help! 🌱"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { file_url } = await appClient.integrations.Core.UploadFile({ file });
        setUploadedImage(file_url);
      } catch (error) {
        console.error("Failed to upload image:", error);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !uploadedImage) return;

    const userMessage = {
      role: "user",
      content: input,
      image: uploadedImage
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    const currentImage = uploadedImage;
    setUploadedImage(null);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const prompt = `You are an expert agricultural AI assistant helping farmers and gardeners.

Previous conversation:
${conversationHistory}

User's question: ${input}

Provide helpful, accurate, and practical advice. Be specific about:
- Plant care and maintenance
- Disease identification and treatment
- Pest control methods
- Fertilizer recommendations
- Soil management
- Irrigation practices
- Seasonal tips
- Best farming practices

Be conversational, supportive, and encouraging.`;

      const response = await appClient.integrations.Core.InvokeLLM({
        prompt,
        file_urls: currentImage ? [currentImage] : undefined,
        add_context_from_internet: true
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col">
      <div className="glass-panel rounded-b-none bg-gradient-to-r from-violet-600/90 via-purple-600/85 to-fuchsia-600/85 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Farming Assistant</h2>
            <p className="text-violet-100 text-sm">Ask me anything about farming and plants</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col border-none shadow-lg rounded-t-none overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-violet-100 p-1.5 rounded-lg">
                      <Leaf className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">AI Assistant</span>
                  </div>
                )}
                <div className={`rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {message.image && (
                    <img 
                      src={message.image} 
                      alt="Uploaded" 
                      className="rounded-lg mb-2 max-w-full"
                    />
                  )}
                  {message.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2">
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4 bg-white">
          {uploadedImage && (
            <div className="mb-3 relative inline-block">
              <img src={uploadedImage} alt="Upload preview" className="h-20 rounded-lg" />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Camera className="w-5 h-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
              placeholder="Ask about plants, diseases, fertilizers..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && !uploadedImage)}
              className="bg-violet-600 hover:bg-violet-700 shrink-0"
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
