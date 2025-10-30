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
      className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative group ${
        selected
          ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-md scale-[1.02]'
          : 'hover:bg-white/70 hover:shadow-sm text-gray-800'
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
          className={`text-sm font-medium truncate pr-2 transition-colors ${
            selected ? 'text-white' : 'text-gray-800'
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
