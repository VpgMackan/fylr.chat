import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getConversationWsToken } from "@/services/api/chat.api";
import { MessageApiResponse, WsServerEventPayload } from "@fylr/types";

export function useChat(chatId: string | null) {
  const [messages, setMessages] = useState<MessageApiResponse[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const STREAMING_ASSISTANT_ID = "streaming-assistant-msg";

  useEffect(() => {
    if (!chatId) return;

    const connectSocket = async () => {
      try {
        const { token } = await getConversationWsToken(chatId);
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

        socket.on(
          "conversationAction",
          (event: WsServerEventPayload & { data: any }) => {
            const { action, data, conversationId: eventConvId } = event;

            if (eventConvId !== chatId) return;

            switch (action) {
              case "newMessage":
                setMessages((prev) => [...prev, data]);
                break;

              case "messageChunk":
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.id === STREAMING_ASSISTANT_ID) {
                    const updatedMsg = {
                      ...lastMsg,
                      content: lastMsg.content + data.content,
                    };
                    return [...prev.slice(0, -1), updatedMsg];
                  } else {
                    return [
                      ...prev,
                      {
                        id: STREAMING_ASSISTANT_ID,
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
                  ...prev.filter((m) => m.id !== STREAMING_ASSISTANT_ID),
                  data,
                ]);
                break;

              case "streamError":
                console.error("AI Stream Error:", data.message);
                break;

              case "messageDeleted":
                setMessages((prev) =>
                  prev.filter((m) => m.id !== data.messageId)
                );
                break;

              case "messageUpdated":
                setMessages((prev) =>
                  prev.map((m) => (m.id === data.id ? data : m))
                );
                break;

              default:
                break;
            }
          }
        );
      } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
      }
    };

    void connectSocket();

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

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (socketRef.current && chatId) {
        socketRef.current.emit("conversationAction", {
          action: "deleteMessage",
          conversationId: chatId,
          messageId,
        });
      }
    },
    [chatId]
  );

  const updateMessage = useCallback(
    (messageId: string, content: string) => {
      if (socketRef.current && chatId && content.trim()) {
        socketRef.current.emit("conversationAction", {
          action: "updateMessage",
          conversationId: chatId,
          messageId,
          content,
        });
      }
    },
    [chatId]
  );

  const regenerateMessage = useCallback(
    (messageId: string) => {
      if (socketRef.current && chatId) {
        socketRef.current.emit("conversationAction", {
          action: "regenerateMessage",
          conversationId: chatId,
          messageId,
        });
      }
    },
    [chatId]
  );

  return {
    messages,
    sendMessage,
    deleteMessage,
    updateMessage,
    regenerateMessage,
    isConnected,
  };
}
