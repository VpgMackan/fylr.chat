import MarkdownComponent from '@/components/MarkdownComponents';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

interface RelatedSource {
  id: string;
  sourceId: string;
  pocketId: string;
  name: string;
  chunkIndex: number;
}

export default function Chat({
  user,
  text,
  metadata,
  onRegenerate,
  onDelete,
  onCopy,
  onSourceClick,
  createdAt,
}: {
  user: boolean;
  text: string;
  metadata?: { relatedSources?: RelatedSource[] };
  onRegenerate: () => void;
  onDelete: () => void;
  onCopy?: () => void;
  onSourceClick?: (src: RelatedSource) => void;
  createdAt?: string;
}) {
  const t = useTranslations('features.chat');
  const router = useRouter();

  const maxWidthClass = user ? 'max-w-[30%]' : 'max-w-[70%]';
  const justifyContentClass = user ? 'justify-end' : 'justify-start';
  const bubbleStyle = user
    ? 'bg-blue-200 border-blue-300'
    : 'bg-gray-100 border-gray-300';

  const relatedSources = metadata?.relatedSources || [];

  return (
    <div
      className={`flex flex-col ${user ? 'items-end' : 'items-start'}`}
      role="listitem"
      aria-label={user ? t('userMessage') : t('assistantMessage')}
    >
      <div
        className={`border-2 p-4 rounded-4xl ${maxWidthClass} ${bubbleStyle}`}
      >
        <MarkdownComponent text={text} />
      </div>

      <div className={`flex mt-2 justify-between w-full ${maxWidthClass}`}>
        <div>
          {!user && relatedSources.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-600 mb-1">
                {t('sourcesUsed')}
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedSources.map((chunk, index) => (
                  <button
                    key={chunk.id}
                    onClick={() =>
                      router.push(
                        `/pocket/${chunk.pocketId}/source/${chunk.sourceId}`,
                      )
                    }
                    className="flex items-center gap-1.5 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full hover:bg-gray-300 transition-colors"
                    title={`${chunk.name} (Chunk starting at index ${chunk.chunkIndex})`}
                  >
                    <span className="font-bold mr-1 bg-gray-300 rounded-full h-4 w-4 flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    <Icon icon="mdi:file-document-outline" />
                    <span className="truncate max-w-24">{chunk.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-semibold text-gray-600 mb-1 text-right">
            {t('messageActions')}
          </p>
          <div className="flex flex-row-reverse gap-2">
            {!user && (
              <button
                onClick={() => onRegenerate()}
                className="flex items-center gap-1.5 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full hover:bg-gray-300 transition-colors"
              >
                <Icon
                  icon="mdi:sync"
                  width="20"
                  height="20"
                  aria-label={t('send')}
                />
              </button>
            )}

            <button
              onClick={() => onDelete()}
              className="flex items-center gap-1.5 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full hover:bg-gray-300 transition-colors"
            >
              <Icon
                icon="mdi:trash"
                width="20"
                height="20"
                aria-label={t('send')}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
