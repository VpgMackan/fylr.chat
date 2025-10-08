import { Icon } from '@iconify/react';

interface LibraryPillProps {
  name: string;
  onRemove: () => void;
}

export default function LibraryPill({ name, onRemove }: LibraryPillProps) {
  return (
    <div className="flex items-center bg-blue-500 text-white text-sm font-semibold px-2 py-1 rounded-full mr-2">
      <span>@{name}</span>
      <button
        onClick={onRemove}
        className="ml-1.5 hover:bg-blue-600 rounded-full"
      >
        <Icon icon="mdi:close" width="16" height="16" />
      </button>
    </div>
  );
}
