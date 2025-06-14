"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

import Button from "@/components/common/Button";
import ChatInput from "@/components/features/chat/ChatInput";
import SourceCheckbox from "@/components/features/chat/SourceCheckbox";
import Chat from "@/components/features/chat/Chat";
import ContentLayout from "@/components/layout/ContentLayout";
import axios from "@/utils/axios";

import { WsServerEventPayload, MessageApiResponse } from "@fylr/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata: object;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatid: string }>;
}) {
  const t = useTranslations("pages.chatDetail");

  const [_, setPocketId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  // const [sources, setSources] = useState([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    params.then((res) => {
      setPocketId(res.id);
      setChatId(res.chatid);
    });
  }, [params]);

  useEffect(() => {
    if (!chatId) return;

    const connectSocket = async () => {
      try {
        const { data } = await axios.post(
          `/chat/conversation/${chatId}/ws-token`
        );
        const token = data.token;

        const socket = io("http://localhost:3001/chat", {
          auth: { token },
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Socket.IO connected successfully.");
          socket.emit("conversationAction", {
            action: "join",
            conversationId: chatId,
          });
        });

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
          }
        });

        socket.on("disconnect", () => {
          console.log("Socket.IO disconnected.");
        });
      } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [chatId]);

  const handleSend = async (content: string) => {
    if (!socketRef.current || !chatId || !content.trim()) return;

    socketRef.current.emit("conversationAction", {
      action: "sendMessage",
      conversationId: chatId,
      content,
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ContentLayout
      title="What is nine plus ten?"
      infrontTitle={<Icon icon="weui:back-outlined" onClick={handleBack} />}
      rightSideContent={<Button text={t("editButton")} className="mr-2" />}
      sidebarContent={
        <>
          <p className="text-xl">{t("yourSources")}</p>
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            <SourceCheckbox
              fileName="What's ai's impact on the world?"
              fileType="pdf"
            />
            <SourceCheckbox
              fileName="What's ai's impact on the world?"
              fileType="web"
            />
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4">
        {messages.map((m) => (
          <Chat key={m.id} user={m.role === "user"} text={m.content} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSend} />
    </ContentLayout>
  );
}
