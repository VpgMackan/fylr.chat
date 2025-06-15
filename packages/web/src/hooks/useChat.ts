import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getConversationsTokenById } from "@/services/api/chat.api";
import { MessageApiResponse, WsServerEventPayload } from "@fylr/types";

export function useChat(chatId: string | null) {
  const [messages, setMessages] = useState<MessageApiResponse[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!chatId) return;

    const connectSocket = async () => {
      try {
        const { token } = await getConversationsTokenById(chatId);
        const socket = io("http://localhost:3001/chat", { auth: { token } });
        socketRef.current = socket;

        socket.on("connect", () => {
          setIsConnected(true);
          socket.emit("conversationAction", {
            action: "join",
            conversationId: chatId,
          });
        });

        socket.on("disconnect", () => setIsConnected(false));

        socket.on("conversationHistory", (history: MessageApiResponse[]) => {
          setMessages(history);
        });

        socket.on("conversationAction", (event: WsServerEventPayload) => {
          const { action, data } = event;

          switch (action) {
            case "newMessage":
              setMessages((prev) => [...prev, data]);
              break;

            case "messageChunk":
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.id === "streaming-assistant-msg") {
                  const updatedMsg = {
                    ...lastMsg,
                    content: lastMsg.content + data.content,
                  };
                  return [...prev.slice(0, -1), updatedMsg];
                } else {
                  return [
                    ...prev,
                    {
                      id: "streaming-assistant-msg",
                      conversationId: chatId,
                      role: "assistant",
                      content: data.content,
                      createdAt: new Date().toISOString(),
                      metadata: {},
                    },
                  ];
                }
              });
              break;

            case "messageEnd":
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== "streaming-assistant-msg"),
                data,
              ]);
              break;

            case "streamError":
              console.error("AI Stream Error:", data.message);
              break;
            default:
              break;
          }
        });
      } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
      }
    };

    connectSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [chatId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (socketRef.current && chatId && content.trim()) {
        socketRef.current.emit("conversationAction", {
          action: "sendMessage",
          conversationId: chatId,
          content,
        });
      }
    },
    [chatId]
  );

  return { messages, sendMessage, isConnected };
}
