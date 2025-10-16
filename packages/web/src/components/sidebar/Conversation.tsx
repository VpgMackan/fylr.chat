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
      className={`px-3 py-2 rounded-lg cursor-pointer transition-colors relative group ${
        selected ? 'bg-blue-200' : 'hover:bg-blue-300'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-800 truncate pr-2">{name}</p>
        <div
          className={`flex-shrink-0 transition-all ${
            isHovered ? 'opacity-100' : 'opacity-0'
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
