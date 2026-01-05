import MarkdownComponent from '@/components/ui/MarkdownComponents';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

interface RelatedSource {
  id: string;
  sourceId: string;
  libraryId: string;
  name: string;
  chunkIndex: number;
}

interface MessageMetadata {
  relatedSources?: RelatedSource[];
  rerankingUsed?: boolean;
  userRole?: 'FREE' | 'PRO';
  agentMode?: string;
  modelUsed?: string;
}

interface RelatedSourceButtonProps {
  chunk: RelatedSource;
  index: number;
  onClick: (chunk: RelatedSource) => void;
}

interface ActionButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
  variant?: 'default' | 'primary' | 'danger';
  showLabel?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  icon,
  label,
  variant = 'default',
  showLabel = false,
  isLoading = false,
  disabled = false,
}) => {
  const baseStyles =
    'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    default:
      'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-200',
    primary:
      'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200',
    danger:
      'bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 border border-red-200',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]}`}
      title={label}
      disabled={disabled || isLoading}
      aria-label={label}
    >
      <Icon
        icon={isLoading ? 'line-md:loading-loop' : icon}
        width="16"
        height="16"
        className={isLoading ? 'animate-spin' : ''}
      />
      {showLabel && <span>{label}</span>}
    </button>
  );
};

const RelatedSourceButton: React.FC<RelatedSourceButtonProps> = ({
  chunk,
  index,
  onClick,
}) => {
  const handleClick = useCallback(() => onClick(chunk), [chunk, onClick]);

  return (
    <button
      key={chunk.id}
      onClick={handleClick}
      className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
      title={`${chunk.name} (Chunk starting at index ${chunk.chunkIndex})`}
    >
      <span className="font-bold bg-blue-200 rounded-full h-5 w-5 flex items-center justify-center text-xs">
        {index + 1}
      </span>
      <Icon icon="mdi:file-document-outline" className="w-4 h-4" />
      <span className="truncate max-w-24 font-medium">{chunk.name}</span>
    </button>
  );
};

export default function ChatBubble({
  user,
  text,
  metadata,
  onRegenerate,
  onDelete,
  messageId,
  isRegenerating = false,
  isLastAssistantMessage = false,
}: {
  user: boolean;
  text: string;
  metadata?: MessageMetadata;
  onRegenerate: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  messageId: string;
  isRegenerating?: boolean;
  isLastAssistantMessage?: boolean;
}) {
  const t = useTranslations('features.chat');
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const maxWidthClass = user ? 'max-w-[50%]' : 'max-w-[85%] lg:max-w-[70%]';
  const bubbleStyle = user
    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400 shadow-sm'
    : 'bg-white border-gray-200 shadow-sm';

  const relatedSources = metadata?.relatedSources || [];
  const showRerankingUpsell =
    !user &&
    relatedSources.length > 0 &&
    metadata?.userRole === 'FREE' &&
    metadata?.rerankingUsed === false;

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete(messageId);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  }, [onDelete, messageId, showDeleteConfirm]);

  const handleRegenerate = useCallback(() => {
    if (!isRegenerating) {
      onRegenerate(messageId);
    }
  }, [onRegenerate, messageId, isRegenerating]);

  const handleVisitingSource = useCallback(
    (chunk: RelatedSource) =>
      router.push(
        `/library/${chunk.libraryId}/source/${chunk.sourceId}#${chunk.chunkIndex}`,
      ),
    [router],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, [text]);

  return (
    <div
      className={`flex flex-col ${user ? 'items-end' : 'items-start'} group`}
      role="listitem"
      aria-label={user ? t('userMessage') : t('assistantMessage')}
    >
      {/* Message bubble */}
      <div
        className={`border p-4 rounded-2xl ${maxWidthClass} ${bubbleStyle} ${
          user ? '' : 'prose prose-sm max-w-none'
        }`}
      >
        <MarkdownComponent text={text} />
      </div>

      {/* Reranking upsell for free users */}
      {showRerankingUpsell && (
        <div className="mt-3 flex items-start gap-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl px-4 py-3 w-full max-w-[70%]">
          <Icon
            icon="mdi:star-circle"
            className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold text-purple-700">Pro users</span>{' '}
              get higher-quality answers with AI-powered re-ranking.{' '}
              <button
                onClick={() => router.push('/profile')}
                className="text-purple-600 hover:text-purple-700 font-medium underline decoration-purple-300 hover:decoration-purple-500 transition-colors"
              >
                Learn more
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Bottom section with sources and actions */}
      <div
        className={`flex mt-3 gap-4 w-full ${maxWidthClass} ${
          user ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Sources section (only for assistant messages) */}
        {!user && relatedSources.length > 0 && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon
                icon="mdi:book-open-page-variant"
                className="w-4 h-4 text-gray-500"
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('sourcesUsed')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedSources.map((chunk, index) => (
                <RelatedSourceButton
                  key={chunk.id}
                  chunk={chunk}
                  index={index}
                  onClick={handleVisitingSource}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          className={`flex flex-col ${user ? 'items-start' : 'items-end'} ${
            !user && relatedSources.length > 0 ? '' : 'ml-auto'
          }`}
        >
          <div className="flex gap-1.5">
            {/* Regenerate button - only for assistant messages */}
            {!user && (
              <ActionButton
                onClick={handleRegenerate}
                icon="mdi:refresh"
                label={
                  isRegenerating ? 'Regenerating...' : 'Regenerate response'
                }
                variant="primary"
                isLoading={isRegenerating}
                showLabel={isLastAssistantMessage}
                disabled={isRegenerating}
              />
            )}

            {/* Copy button */}
            <ActionButton
              onClick={handleCopy}
              icon={copied ? 'mdi:check' : 'mdi:content-copy'}
              label={copied ? 'Copied!' : 'Copy to clipboard'}
              variant={copied ? 'primary' : 'default'}
            />

            {/* Delete button with confirmation */}
            {showDeleteConfirm ? (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-150 font-medium animate-pulse"
              >
                <Icon icon="mdi:alert" width="16" height="16" />
                <span>Confirm delete</span>
              </button>
            ) : (
              <ActionButton
                onClick={handleDelete}
                icon="mdi:trash-can-outline"
                label="Delete message"
                variant="danger"
              />
            )}
          </div>

          {/* Metadata info (optional) */}
          {!user && metadata?.agentMode && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
              <Icon icon="mdi:robot-outline" className="w-3.5 h-3.5" />
              <span>{metadata.agentMode}</span>
              {metadata.modelUsed && (
                <>
                  <span>•</span>
                  <span>{metadata.modelUsed}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
