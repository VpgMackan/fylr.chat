"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Heading from "@/components/layout/Heading";
import Button from "@/components/common/Button";
import ChatInput from "@/components/features/chat/ChatInput";

import Chat from "@/components/features/chat/Chat";
import SourceCheckbox from "@/components/features/chat/SourceCheckbox";

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
    <Heading
      title="What is nine plus ten?"
      infrontTitle={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      rightSideContent={<Button text="Edit" className="mr-2" />}
    >
      <div
        className="grid grid-cols-6 gap-4 h-full overflow-y-hidden pb-4 pt-8"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="bg-blue-100 rounded-2xl border-2 border-blue-300 p-4">
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
        </div>
        <div className="bg-blue-100 col-span-5 rounded-2xl border-2 border-blue-300 p-4 flex flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4">
            <Chat
              user={true}
            >{`Hello, how are you doing today? Can you give me some mock markdown?`}</Chat>

            <Chat user={false}>{`No`}</Chat>
          </div>

          <ChatInput />
        </div>
      </div>
    </Heading>
  );
}
