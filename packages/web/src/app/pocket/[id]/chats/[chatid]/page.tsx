"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Heading from "@/components/layout/Heading";
import Button from "@/components/common/Button";
import ChatInput from "@/components/ChatInput";

function Chat({
  user,
  children,
}: {
  user: boolean;
  children: React.ReactElement;
}) {
  const maxWidthClass = user ? "max-w-[30%]" : "max-w-[70%]";
  const justifyContentClass = user ? "justify-end" : "justify-start";
  return (
    <div className={`flex ${justifyContentClass}`}>
      <div
        className={`bg-blue-200 border-2 border-blue-300 p-4 rounded-4xl ${maxWidthClass}`}
      >
        <div>{children}</div>
      </div>
    </div>
  );
}

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
      <div className="grid grid-cols-6 gap-4 h-full overflow-y-hidden pb-4 pt-8">
        <div className="bg-blue-100 rounded-2xl border-2 border-blue-300 p-4"></div>
        <div className="bg-blue-100 col-span-5 rounded-2xl border-2 border-blue-300 p-4 flex flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4">
            <Chat user={true}>
              <p>
                Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque
                faucibus ex sapien vitae pellentesque sem placerat. In id cursus
                mi pretium tellus duis convallis. Tempus leo eu aenean sed diam
                urna tempor.
              </p>
            </Chat>

            <Chat user={false}>
              <>
                <p>
                  Lorem ipsum dolor sit amet consectetur adipiscing elit.
                  Quisque faucibus ex sapien vitae pellentesque sem placerat. In
                  id cursus mi pretium tellus duis convallis. Tempus leo eu
                  aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus
                  nec metus bibendum egestas. Iaculis massa nisl malesuada
                  lacinia integer nunc posuere. Ut hendrerit semper vel class
                  aptent taciti sociosqu. Ad litora torquent per conubia nostra
                  inceptos himenaeos.
                </p>
                <p>
                  Lorem ipsum dolor sit amet consectetur adipiscing elit.
                  Quisque faucibus ex sapien vitae pellentesque sem placerat. In
                  id cursus mi pretium tellus duis convallis. Tempus leo eu
                  aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus
                  nec metus bibendum egestas. Iaculis massa nisl malesuada
                  lacinia integer nunc posuere. Ut hendrerit semper vel class
                  aptent taciti sociosqu. Ad litora torquent per conubia nostra
                  inceptos himenaeos.
                </p>
              </>
            </Chat>
          </div>

          <ChatInput />
        </div>
      </div>
    </Heading>
  );
}
