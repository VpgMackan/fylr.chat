import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import { Icon } from '@iconify/react';
import { listLibraries, SimpleLibrary } from '@/services/api/library.api';
import { getSourcesByLibraryId } from '@/services/api/source.api';
import LibraryPill from './LibraryPill';
import LibraryMentionPopup from './LibraryMentionPopup';

interface ChatInputProps {
  onSend: (payload: { content: string; sourceIds?: string[] }) => void;
  className?: string;
}

export default function ChatInput({ onSend, className = '' }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedLibraries, setSelectedLibraries] = useState<SimpleLibrary[]>(
    [],
  );

  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentioning, setIsMentioning] = useState(false);
  const [allLibraries, setAllLibraries] = useState<SimpleLibrary[]>([]);
  const [filteredLibraries, setFilteredLibraries] = useState<SimpleLibrary[]>(
    [],
  );
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listLibraries().then(setAllLibraries).catch(console.error);
  }, []);

  useEffect(() => {
    if (isMentioning) {
      const filtered = allLibraries.filter((lib) =>
        lib.title.toLowerCase().includes(mentionQuery.toLowerCase()),
      );
      setFilteredLibraries(filtered);
      setMentionIndex(0);
    }
  }, [mentionQuery, isMentioning, allLibraries]);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  };

  useLayoutEffect(adjustHeight, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1 && (atIndex === 0 || /\s/.test(value[atIndex - 1]))) {
      setIsMentioning(true);
      setMentionQuery(value.substring(atIndex + 1));
    } else {
      setIsMentioning(false);
    }
    setInputValue(value);
  };

  const handleSelectLibrary = (library: SimpleLibrary) => {
    setSelectedLibraries((prev) => [...prev, library]);
    const atIndex = inputValue.lastIndexOf('@');
    setInputValue(inputValue.substring(0, atIndex));
    setIsMentioning(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  const handleRemoveLibrary = (libraryId: string) => {
    setSelectedLibraries((prev) => prev.filter((lib) => lib.id !== libraryId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentioning) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredLibraries.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (prev) =>
            (prev - 1 + filteredLibraries.length) % filteredLibraries.length,
        );
      } else if (
        (e.key === 'Enter' || e.key === 'Tab') &&
        filteredLibraries.length > 0
      ) {
        e.preventDefault();
        handleSelectLibrary(filteredLibraries[mentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsMentioning(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content && selectedLibraries.length === 0) return;

    let allSourceIds: string[] = [];
    if (selectedLibraries.length > 0) {
      const sourcePromises = selectedLibraries.map((lib) =>
        getSourcesByLibraryId(lib.id),
      );
      const sourcesByLibrary = await Promise.all(sourcePromises);
      allSourceIds = sourcesByLibrary.flat().map((source) => source.id);
    }

    onSend({
      content,
      sourceIds: allSourceIds.length > 0 ? allSourceIds : undefined,
    });
    setInputValue('');
    setSelectedLibraries([]);
  };

  return (
    <div className={`w-full relative ${className}`}>
      {isMentioning && (
        <LibraryMentionPopup
          libraries={filteredLibraries}
          onSelect={handleSelectLibrary}
          selectedIndex={mentionIndex}
        />
      )}
      <div className="flex flex-col bg-blue-200 rounded-2xl border border-blue-300 shadow-md p-2">
        <div className="flex items-center flex-wrap p-1">
          {selectedLibraries.map((lib) => (
            <LibraryPill
              key={lib.id}
              name={lib.title}
              onRemove={() => handleRemoveLibrary(lib.id)}
            />
          ))}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none p-1 overflow-y-auto min-h-[28px] max-h-40"
            placeholder="Ask anything, or type @ to select a library..."
            rows={1}
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-2">
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:plus" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:web" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:dots-horizontal" width="20" height="20" />
            </button>
          </div>

          <div className="flex gap-4">
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:microphone" width="20" height="20" />
            </button>
            <button
              className="p-2 bg-blue-500 rounded-full hover:bg-blue-700"
              onClick={handleSend}
            >
              <Icon icon="mdi:arrow-up" width="20" height="20" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
