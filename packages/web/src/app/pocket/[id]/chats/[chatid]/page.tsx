"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";

import ChatInput from "@/components/features/chat/ChatInput";
import SourceCheckbox from "@/components/features/chat/SourceCheckbox";

import Chat from "@/components/features/chat/Chat";
import ContentLayout from "@/components/layout/ContentLayout";
import axios from "@/utils/axios";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatid: string }>;
}) {
  const t = useTranslations("pages.chatDetail");

  const [id, setId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const [sources, setSources] = useState([]);
  const [messages, setMessages] = useState<
    { id: string; role: string; content: string }[]
  >([]);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setChatId(res.chatid);
    });
  }, [params]);

  useEffect(() => {
    if (!chatId) return;
    async function load() {
      try {
        const { data } = await axios.get(
          `chat/conversation/${chatId}/messages`
        );
        setMessages(data.reverse());
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    }
    load();
  }, [chatId]);

  const handleSend = async (content: string) => {
    if (!chatId) return;
    try {
      const { data } = await axios.post(`chat/conversation/${chatId}/message`, {
        content,
        role: "user",
        metadata: {},
      });
      const [userMsg, assistantMsg] = data;
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <ContentLayout
      title="What is nine plus ten?"
      infrontTitle={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
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
          <Chat key={m.id} user={m.role === "user"}>
            {m.content}
          </Chat>
        ))}
      </div>

      <ChatInput onSend={handleSend} />
    </ContentLayout>
  );
}
