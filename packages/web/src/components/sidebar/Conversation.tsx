'use client';

import { useState } from 'react';
import ConversationOptionsMenu from '../ui/ConversationOptionsMenu';

interface ConversationProps {
  id: string;
  name: string;
  selected: boolean;
  onClick?: () => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function Conversation({
  id,
  name,
  selected,
  onClick,
  onRename,
  onDelete,
}: ConversationProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative group ${
        selected
          ? 'bg-blue-600 text-white shadow-md'
          : 'hover:bg-gray-200 text-gray-800 hover:text-gray-900'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Select ${name}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-sm font-semibold truncate pr-2 transition-colors ${
            selected ? 'text-white' : ''
          }`}
          title={name}
        >
          {name}
        </p>
        <div
          className={`flex-shrink-0 transition-all duration-200 ${
            isHovered || selected ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ConversationOptionsMenu
            conversationId={id}
            conversationName={name}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
