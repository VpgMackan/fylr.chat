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

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatid: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setChatId(res.chatid);
    });
  }, [params]);

  return (
    <ContentLayout
      title="What is nine plus ten?"
      infrontTitle={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      rightSideContent={<Button text="Edit" className="mr-2" />}
      sidebarContent={
        <>
          <p className="text-xl">Your sources</p>
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
        <Chat
          user={true}
        >{`Hello, how are you doing today? Can you give me some mock markdown?`}</Chat>

        <Chat user={false}>{`No`}</Chat>
      </div>

      <ChatInput />
    </ContentLayout>
  );
}
