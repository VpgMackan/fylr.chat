'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function Conversation({
  name,
  selected,
}: {
  name: string;
  selected: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`px-3 py-2 rounded-lg cursor-pointer transition-colors relative group ${
        selected ? 'bg-blue-200' : 'hover:bg-blue-300'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-800 truncate pr-2">{name}</p>
        <button
          className={`flex-shrink-0 p-1 hover:bg-blue-300 rounded transition-all ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Icon
            icon="heroicons-solid:dots-horizontal"
            width="16"
            height="16"
            className="text-gray-600"
          />
        </button>
      </div>
    </div>
  );
}
