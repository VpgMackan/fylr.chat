'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ChatInput from '@/components/ui/ChatInput';
import ChatBubble from '@/components/ui/ChatBubble';
import AgentThoughts from '@/components/ui/AgentThought';
import { useChat } from '@/hooks/useChat';
import { Icon } from '@iconify/react';

export default function ConversationIdPageView() {
  const params = useParams();
  const conversationId = params.conversationid as string;
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<
    string | null
  >(null);

  const {
    messages,
    sources,
    sendMessage,
    regenerateMessage,
    deleteMessage,
    stopGeneration,
    retryLastMessage,
    clearError,
    connectionStatus,
    status,
    toolProgress,
    currentThoughts,
    agentMode,
    error,
    isGenerating,
  } = useChat(conversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentThoughts]);

  // Clear regenerating state when streaming starts or ends
  useEffect(() => {
    if (status || messages.some((m) => m.id === 'streaming-assistant-msg')) {
      setRegeneratingMessageId(null);
    }
  }, [status, messages]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      setRegeneratingMessageId(messageId);
      regenerateMessage(messageId);
    },
    [regenerateMessage],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      deleteMessage(messageId);
    },
    [deleteMessage],
  );

  // Find the last assistant message for showing the regenerate label
  const lastAssistantMessageIndex = messages.reduceRight((acc, m, idx) => {
    if (
      acc === -1 &&
      m.role === 'assistant' &&
      m.id !== 'streaming-assistant-msg'
    ) {
      return idx;
    }
    return acc;
  }, -1);

  return (
    <div className="w-full col-span-5 p-4 flex flex-col h-full">
      {connectionStatus === 'connected' || messages.length > 0 ? (
        <>
          <div className="flex flex-col gap-6 flex-grow overflow-y-auto mb-4 pr-2">
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
                  onRegenerate={handleRegenerate}
                  onDelete={handleDeleteMessage}
                  messageId={m.id}
                  isRegenerating={regeneratingMessageId === m.id}
                  isLastAssistantMessage={index === lastAssistantMessageIndex}
                />
              </div>
            ))}

            {/* Show current thoughts even if no streaming message exists yet */}
            {currentThoughts.length > 0 &&
              !messages.some((m) => m.id === 'streaming-assistant-msg') && (
                <AgentThoughts thoughts={currentThoughts} />
              )}

            {/* Show error message with retry option */}
            {error && (
              <div className="flex flex-col gap-3 max-w-[85%] lg:max-w-[70%]">
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <Icon
                    icon="mdi:alert-circle"
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800">
                      Generation failed
                    </p>
                    <p className="text-sm text-red-600 mt-0.5">
                      {error.message}
                    </p>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    aria-label="Dismiss error"
                  >
                    <Icon icon="mdi:close" className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={retryLastMessage}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    <Icon icon="mdi:refresh" className="w-4 h-4" />
                    Retry
                  </button>
                  <button
                    onClick={clearError}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Show connecting indicator if still connecting but have messages */}
            {connectionStatus !== 'connected' && messages.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg w-fit">
                <Icon icon="line-md:loading-loop" className="w-4 h-4" />
                <span>Reconnecting...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Status indicators with stop button */}
          {(status || toolProgress || isGenerating) && !error && (
            <div className="flex flex-col gap-2 mb-3 mx-auto items-center">
              {status && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                  <Icon
                    icon="line-md:loading-twotone-loop"
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="font-medium">{status.stage}</span>
                  <span className="text-gray-400">•</span>
                  <span>{status.message}</span>
                </div>
              )}
              {toolProgress && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
                  <Icon icon="mdi:tools" className="w-4 h-4" />
                  <span className="font-medium">
                    {toolProgress.toolName.replace(/_/g, ' ')}
                  </span>
                  <span className="text-blue-400">•</span>
                  <span>{toolProgress.message}</span>
                </div>
              )}
              {/* Stop generation button */}
              {isGenerating && (
                <button
                  onClick={stopGeneration}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-full hover:bg-red-100 transition-colors border border-red-200 mt-1"
                >
                  <Icon icon="mdi:stop-circle" className="w-4 h-4" />
                  Stop generating
                </button>
              )}
            </div>
          )}

          <ChatInput
            onSend={sendMessage}
            showSourceMenu={true}
            conversationSources={sources}
            disabled={connectionStatus !== 'connected' || isGenerating}
            initialAgentMode={agentMode || 'AUTO'}
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
