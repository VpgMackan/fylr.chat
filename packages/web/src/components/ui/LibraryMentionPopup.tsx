import { SimpleLibrary } from '@/services/api/library.api';

interface LibraryMentionPopupProps {
  libraries: SimpleLibrary[];
  onSelect: (library: SimpleLibrary) => void;
  selectedIndex: number;
}

export default function LibraryMentionPopup({
  libraries,
  onSelect,
  selectedIndex,
}: LibraryMentionPopupProps) {
  if (libraries.length === 0) return null;

  return (
    <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-10">
      <ul className="max-h-60 overflow-y-auto">
        {libraries.map((lib, index) => (
          <li
            key={lib.id}
            onClick={() => onSelect(lib)}
            className={`px-3 py-2 cursor-pointer text-sm ${
              index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-50'
            }`}
          >
            {lib.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
