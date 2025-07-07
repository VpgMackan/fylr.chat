'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslations } from 'next-intl';

interface ChatInputProps {
  onSend: (content: string) => void;
}
export default function ChatInput({ onSend }: ChatInputProps) {
  const t = useTranslations('features.chat');

  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  const handleSend = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="flex flex-col p-2 bg-blue-200 rounded-2xl">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={t('inputPlaceholder')}
        className="flex-grow bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none p-2 overflow-y-auto max-h-40"
      />

      <div className="flex justify-between">
        <div className="flex gap-2">
          <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
            <Icon
              icon="mdi:plus"
              width="20"
              height="20"
              aria-label={t('upload')}
            />
          </button>
          <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
            <Icon
              icon="mdi:web"
              width="20"
              height="20"
              aria-label={t('webSearch')}
            />
          </button>
          <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
            <Icon
              icon="mdi:dots-horizontal"
              width="20"
              height="20"
              aria-label={t('more')}
            />
          </button>
        </div>

        <div className="flex gap-4">
          <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
            <Icon
              icon="mdi:microphone"
              width="20"
              height="20"
              aria-label={t('record')}
            />
          </button>
          <button
            className="p-2 bg-blue-500 rounded-full hover:bg-blue-700"
            onClick={handleSend}
          >
            <Icon
              icon="mdi:arrow-up"
              width="20"
              height="20"
              aria-label={t('send')}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
