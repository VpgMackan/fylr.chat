import MarkdownComponent from '@/components/MarkdownComponents';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Icon } from '@iconify/react';

interface RelatedSource {
  id: string;
  pocketId: string;
  name: string;
}

export default function Chat({
  user,
  text,
  metadata,
}: {
  user: boolean;
  text: string;
  metadata?: { relatedSources?: RelatedSource[] };
}) {
  const t = useTranslations('features.chat');
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

      {!user && relatedSources.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            {t('sourcesUsed')}
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedSources.map((source) => (
              <button
                key={source.id}
                className="flex items-center gap-1.5 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full hover:bg-gray-300 transition-colors"
                title={source.name}
              >
                <Icon icon="mdi:file-document-outline" />
                <span className="truncate max-w-24">{source.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
