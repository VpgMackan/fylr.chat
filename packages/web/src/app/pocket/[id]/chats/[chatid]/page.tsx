"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import ChatInput from "@/components/features/chat/ChatInput";
import SourceCheckbox from "@/components/features/chat/SourceCheckbox";
import Chat from "@/components/features/chat/ChatBubble";
import ContentLayout from "@/components/layout/ContentLayout";

import { useChat } from "@/hooks/useChat";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatid: string }>;
}) {
  const t = useTranslations("pages.chatDetail");

  const [_, setPocketId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const { messages, sendMessage, isConnected } = useChat(chatId);

  // const [sources, setSources] = useState([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    params.then((res) => {
      setPocketId(res.id);
      setChatId(res.chatid);
    });
  }, [params]);

  const handleBack = () => {
    router.back();
  };

  return (
    <ContentLayout
      title="What is nine plus ten?"
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={handleBack} />
      }
      trailingHeaderActions={<Button text={t("editButton")} className="mr-2" />}
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

      <ChatInput onSend={sendMessage} />
    </ContentLayout>
  );
}
