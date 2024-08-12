// src/components/ChatWindow.tsx
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { createLLM, createRetrievalChain } from "@/lib/langchain";
// import { getVectorStore } from "@/lib/vectorStore";

import { Citation, executePrompt } from "@/lib/SessionUtils";
import { Avatar, AvatarImage } from "./ui/avatar";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}

interface ChatWindowProps {
  sessionId: string;
  selectedModel?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  sessionId,
  selectedModel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (input.trim() === "") return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // const llm = createLLM(selectedModel);
      // const vectorStore = await getVectorStore(sessionId);
      // const chain = createRetrievalChain(llm, vectorStore);

      // const response = await chain.call({
      //   query: input,
      // });

      const response = await executePrompt(sessionId, input);

      const assistantMessage: Message = {
        role: "assistant",
        content: response.generatedText,
        citations: response.citations,
      };
      //   const assistantMessage: Message = {
      //     role: "assistant",
      //     content: "some response from AI",
      //   };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in chat:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, there was an error processing your request.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full mb-2">
          {isOpen ? "Close Chat" : "Open Chat"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="w-full">
          {/* <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader> */}
          <CardContent>
            <ScrollArea className="h-[200px]">
              {messages.map(
                (message, index) =>
                  message.role === "user" ? (
                    <div
                      key={index}
                      className="inline-block p-2 text-left bg-blue-200 rounded-lg"
                    >
                      {message.content}
                    </div>
                  ) : (
                    <div
                      key={index}
                      className="inline-block p-2 my-2 text-right bg-gray-200 rounded-lg"
                    >
                      <Avatar>
                        <AvatarImage src="https://i.pravatar.cc/150?img=2"></AvatarImage>
                      </Avatar>
                      <div className="ml-2">{message.content}</div>
                    </div>
                  )

                // <div
                //   key={index}
                //   className={`flex flex-row ${
                //     message.role === "user" ? "text-right" : "text-left"
                //   }`}
                // >
                //   <div
                //     className={`inline-block p-2 rounded-lg ${
                //       message.role === "user" ? "bg-blue-100" : "bg-gray-100"
                //     }`}
                //   >
                //     {message.content}
                //     {message.role === "assistant" && <div> Citations</div>}
                //   </div>
                // </div>
                //)
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="mt-4 flex">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-grow mr-2"
              />
              <Button onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? "Sending..." : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ChatWindow;
