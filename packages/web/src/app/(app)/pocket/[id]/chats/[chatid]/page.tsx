'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/common/Button';
import ChatInput from '@/components/features/chat/ChatInput';
import SourceCheckbox from '@/components/features/chat/SourceCheckbox';
import Chat from '@/components/features/chat/ChatBubble';
import ContentLayout from '@/components/layout/ContentLayout';

import { useChat } from '@/hooks/useChat';

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatid: string }>;
}) {
  const t = useTranslations('pages.chatDetail');

  const [_, setPocketId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const {
    messages,
    sources,
    name,
    connectionStatus,
    status,
    sendMessage,
    deleteMessage,
    updateSources,
    regenerateMessage,
  } = useChat(chatId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleUpdateSources = (sourceId: string) => {
    if (!sources) return;

    const updatedSources = sources.map((s) =>
      s.id === sourceId ? { ...s, isActive: !s.isActive } : s,
    );

    const activeIds = updatedSources.filter((s) => s.isActive).map((s) => s.id);

    updateSources(activeIds);
  };

  return (
    <ContentLayout
      title={name}
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={handleBack} />
      }
      trailingHeaderActions={<Button text={t('editButton')} className="mr-2" />}
      sidebarContent={
        <>
          <p className="text-xl">{t('yourSources')}</p>
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            {sources &&
              sources.map((m) => (
                <SourceCheckbox
                  key={m.id}
                  fileName={m.name}
                  fileType={m.type}
                  checked={m.isActive}
                  onClick={() => handleUpdateSources(m.id)}
                />
              ))}
          </div>
        </>
      }
    >
      {connectionStatus === 'connected' ? (
        <>
          <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4">
            {messages.map((m) => (
              <Chat
                key={m.id}
                user={m.role === 'user'}
                text={m.content}
                metadata={m.metadata}
                onRegenerate={() => regenerateMessage(m.id)}
                onDelete={() => deleteMessage(m.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {status && (
            <div className="text-center text-sm text-gray-500 mb-2 animate-pulse">
              {status.message}
            </div>
          )}

          <ChatInput onSend={sendMessage} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center flex-grow p-8">
          {connectionStatus === 'connecting' && (
            <div className="flex flex-col items-center text-center">
              <Icon
                icon="line-md:loading-loop"
                className="text-4xl text-blue-500 animate-spin mb-4"
              />
              <p className="text-lg text-gray-600">Connecting to chat...</p>
            </div>
          )}
          {connectionStatus === 'reconnecting' && (
            <div className="flex flex-col items-center text-center">
              <Icon
                icon="line-md:loading-loop"
                className="text-4xl text-yellow-500 animate-spin mb-4"
              />
              <p className="text-lg text-gray-600">Reconnecting...</p>
            </div>
          )}
          {connectionStatus === 'error' && (
            <div className="flex flex-col items-center text-center">
              <Icon
                icon="mdi:alert-circle"
                className="text-4xl text-red-500 mb-4"
              />
              <p className="text-lg text-gray-600">Connection failed</p>
              <p className="text-sm text-gray-500 mt-2">
                Please check your internet connection and try again.
              </p>
            </div>
          )}
        </div>
      )}
    </ContentLayout>
  );
}
