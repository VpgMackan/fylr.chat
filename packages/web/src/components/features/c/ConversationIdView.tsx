'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import ChatInput from '@/components/ui/ChatInput';
import ChatBubble from '@/components/ui/ChatBubble';
import { useChat } from '@/hooks/useChat';
import { Icon } from '@iconify/react';

export default function ConversationIdPageView() {
  const params = useParams();
  const conversationId = params.conversationid as string;

  const {
    messages,
    sources,
    sendMessage,
    regenerateMessage,
    deleteMessage,
    connectionStatus,
    status,
  } = useChat(conversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="w-full col-span-5 p-4 flex flex-col h-full">
      {connectionStatus === 'connected' ? (
        <>
          <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4 pr-2">
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                user={m.role === 'user'}
                text={m.content || ''}
                metadata={m.metadata}
                onRegenerate={() => regenerateMessage(m.id)}
                onDelete={() => deleteMessage(m.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {status && (
            <div className="text-center text-sm text-gray-500 mb-2 animate-pulse">
              {status.stage}: {status.message}
            </div>
          )}

          <ChatInput
            onSend={(data) => {
              sendMessage(data.content);
            }}
            showSourceMenu={true}
            conversationSources={sources}
          />
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <Icon
            icon="line-md:loading-loop"
            className="w-12 h-12 text-blue-500"
          />
        </div>
      )}
    </div>
  );
}
