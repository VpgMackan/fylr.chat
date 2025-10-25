'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import ChatInput from '@/components/ui/ChatInput';
import ChatBubble from '@/components/ui/ChatBubble';
import AgentThoughts from '@/components/ui/AgentThought';
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
    currentThoughts,
  } = useChat(conversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentThoughts]);

  return (
    <div className="w-full col-span-5 p-4 flex flex-col h-full">
      {connectionStatus === 'connected' || messages.length > 0 ? (
        <>
          <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4 pr-2">
            {messages.map((m, index) => (
              <div key={m.id}>
                {/* Show agent thoughts before the assistant message */}
                {m.role === 'assistant' &&
                  m.agentThoughts &&
                  m.agentThoughts.length > 0 && (
                    <AgentThoughts thoughts={m.agentThoughts} />
                  )}

                {/* Show current thoughts before the streaming message */}
                {m.id === 'streaming-assistant-msg' &&
                  currentThoughts.length > 0 && (
                    <AgentThoughts thoughts={currentThoughts} />
                  )}

                <ChatBubble
                  user={m.role === 'user'}
                  text={m.content || ''}
                  metadata={m.metadata}
                  onRegenerate={() => regenerateMessage(m.id)}
                  onDelete={() => deleteMessage(m.id)}
                />
              </div>
            ))}

            {/* Show current thoughts even if no streaming message exists yet */}
            {currentThoughts.length > 0 &&
              !messages.some((m) => m.id === 'streaming-assistant-msg') && (
                <AgentThoughts thoughts={currentThoughts} />
              )}

            {/* Show connecting indicator if still connecting but have messages */}
            {connectionStatus !== 'connected' && messages.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Icon icon="line-md:loading-loop" className="w-4 h-4" />
                <span>Connecting...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {status && (
            <div className="text-center text-sm text-gray-500 mb-2 animate-pulse">
              {status.stage}: {status.message}
            </div>
          )}

          <ChatInput
            onSend={sendMessage}
            showSourceMenu={true}
            conversationSources={sources}
            disabled={connectionStatus !== 'connected'}
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
