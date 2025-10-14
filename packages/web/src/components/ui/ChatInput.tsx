import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Icon } from '@iconify/react';
import { listLibraries, SimpleLibrary } from '@/services/api/library.api';
import { getSourcesByLibraryId } from '@/services/api/source.api';
import LibraryMentionPopup from './LibraryMentionPopup';

interface ChatInputProps {
  onSend: (payload: { content: string; sourceIds?: string[] }) => void;
  className?: string;
  showSourceMenu?: boolean;
  conversationSources?: Array<{
    id: string;
    isActive: boolean;
    [key: string]: any;
  }>;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function ChatInput({
  onSend,
  className = '',
  showSourceMenu = false,
  conversationSources = [],
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentioning, setIsMentioning] = useState(false);
  const [allLibraries, setAllLibraries] = useState<SimpleLibrary[]>([]);
  const [filteredLibraries, setFilteredLibraries] = useState<SimpleLibrary[]>(
    [],
  );
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [librariesWithSources, setLibrariesWithSources] = useState<
    Array<{ library: SimpleLibrary; sources: any[] }>
  >([]);
  const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(
    new Set(),
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listLibraries()
      .then((libs) => {
        setAllLibraries(libs);
      })
      .catch((err) => {
        console.error('[ChatInput] Error fetching libraries:', err);
      });
  }, []);

  const loadLibrariesWithSources = async () => {
    try {
      const libs = await listLibraries();
      const libsWithSources = await Promise.all(
        libs.map(async (lib) => {
          const sources = await getSourcesByLibraryId(lib.id);
          return { library: lib, sources };
        }),
      );
      setLibrariesWithSources(libsWithSources);
    } catch (err) {
      console.error('[ChatInput] Error loading libraries with sources:', err);
    }
  };

  const toggleSourceMenu = () => {
    if (!isSourceMenuOpen) {
      loadLibrariesWithSources();
    }
    setIsSourceMenuOpen(!isSourceMenuOpen);
  };

  const toggleLibrary = (libraryId: string) => {
    setExpandedLibraries((prev) => {
      const next = new Set(prev);
      if (next.has(libraryId)) {
        next.delete(libraryId);
      } else {
        next.add(libraryId);
      }
      return next;
    });
  };

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
      const query = value.substring(atIndex + 1);
      setIsMentioning(true);
      setMentionQuery(query);
    } else {
      setIsMentioning(false);
    }
    setInputValue(value);
  };

  const handleSelectLibrary = (library: SimpleLibrary) => {
    const atIndex = inputValue.lastIndexOf('@');
    const queryStartIndex = atIndex + 1;
    const before = inputValue.substring(0, queryStartIndex);
    const after = inputValue.substring(queryStartIndex + mentionQuery.length);

    const newValue = `${before}${library.title} ${after.trimStart()}`;
    setInputValue(newValue);

    setIsMentioning(false);
    setMentionQuery('');

    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPosition = (before + library.title).length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
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
    if (!content) return;

    const mentionedLibraries = allLibraries.filter((lib) => {
      const escapedTitle = escapeRegExp(lib.title);
      const regex = new RegExp(`@${escapedTitle}(?=\\s|$)`);
      return regex.test(content);
    });

    let sourceIds: string[] = [];
    if (mentionedLibraries.length > 0) {
      const sourcePromises = mentionedLibraries.map((lib) =>
        getSourcesByLibraryId(lib.id),
      );
      const sourcesByLibrary = await Promise.all(sourcePromises);
      sourceIds = [
        ...new Set(sourcesByLibrary.flat().map((source) => source.id)),
      ];
    }

    onSend({
      content,
      sourceIds: sourceIds.length > 0 ? sourceIds : undefined,
    });
    setInputValue('');
  };

  const getConversationSourceIds = (): Set<string> => {
    const sourceIds = new Set<string>();
    conversationSources
      .filter((source) => source.isActive)
      .forEach((source) => sourceIds.add(source.id));
    console.log('[ChatInput] Conversation source IDs:', Array.from(sourceIds));
    return sourceIds;
  };

  const getSelectedSourceIds = (): Set<string> => {
    const sourceIds = new Set<string>();
    const mentionedLibraries = allLibraries.filter((lib) => {
      const escapedTitle = escapeRegExp(lib.title);
      const regex = new RegExp(`@${escapedTitle}(?=\\s|$)`);
      return regex.test(inputValue);
    });

    mentionedLibraries.forEach((lib) => {
      const libData = librariesWithSources.find((l) => l.library.id === lib.id);
      if (libData) {
        libData.sources.forEach((source) => sourceIds.add(source.id));
      }
    });
    return sourceIds;
  };

  const isLibrarySelected = (libraryId: string): boolean => {
    const library = allLibraries.find((lib) => lib.id === libraryId);
    if (!library) return false;
    const escapedTitle = escapeRegExp(library.title);
    const regex = new RegExp(`@${escapedTitle}(?=\\s|$)`);
    return regex.test(inputValue);
  };

  return (
    <div className={`w-full relative ${className}`}>
      {showSourceMenu && (
        <>
          <button
            onClick={toggleSourceMenu}
            className="absolute bottom-full left-0 mb-2 bg-blue-200 rounded-t-2xl border border-blue-300 shadow-md p-3 min-w-[200px] flex items-center hover:bg-blue-300 transition-colors cursor-pointer"
          >
            <div className="text-sm text-gray-700 font-medium">
              Selected Sources
            </div>
            <Icon
              icon={isSourceMenuOpen ? 'mdi:chevron-down' : 'mdi:chevron-up'}
              width="20"
              height="20"
              className="ml-auto text-gray-700"
            />
          </button>

          {isSourceMenuOpen && (
            <div className="absolute bottom-full left-0 mb-[60px] bg-blue-100 rounded-t-2xl border border-blue-300 shadow-lg p-3 min-w-[350px] max-w-[500px] max-h-[400px] overflow-y-auto">
              <div className="text-xs font-semibold text-gray-800 mb-2">
                Libraries & Sources
              </div>

              {librariesWithSources.length === 0 ? (
                <div className="text-xs text-gray-600 italic">
                  Loading libraries...
                </div>
              ) : (
                <div className="space-y-1">
                  {(() => {
                    const conversationSourceIds = getConversationSourceIds();
                    const selectedSourceIds = getSelectedSourceIds();
                    return librariesWithSources.map(({ library, sources }) => {
                      const isSelected = isLibrarySelected(library.id);

                      return (
                        <div
                          key={library.id}
                          className={`bg-white rounded-md border ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-blue-200'} overflow-hidden`}
                        >
                          <button
                            onClick={() => toggleLibrary(library.id)}
                            className="w-full flex items-center justify-between p-2 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <Icon
                                icon="mdi:library"
                                width="14"
                                height="14"
                                className={
                                  isSelected ? 'text-blue-600' : 'text-gray-500'
                                }
                              />
                              <span
                                className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}
                              >
                                {library.title}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({sources.length})
                              </span>
                              {isSelected && (
                                <Icon
                                  icon="mdi:check-circle"
                                  width="14"
                                  height="14"
                                  className="text-green-600"
                                />
                              )}
                            </div>
                            <Icon
                              icon={
                                expandedLibraries.has(library.id)
                                  ? 'mdi:chevron-up'
                                  : 'mdi:chevron-down'
                              }
                              width="16"
                              height="16"
                              className="text-gray-500"
                            />
                          </button>

                          {expandedLibraries.has(library.id) && (
                            <div className="border-t border-blue-200 bg-blue-50/50 p-1.5">
                              {sources.length === 0 ? (
                                <div className="text-xs text-gray-500 italic px-2 py-1">
                                  No sources
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  {sources.map((source) => {
                                    const isSourceInConversation =
                                      conversationSourceIds.has(source.id);
                                    const isSourceSelected =
                                      selectedSourceIds.has(source.id);

                                    return (
                                      <div
                                        key={source.id}
                                        className={`flex items-center gap-1.5 p-1.5 rounded ${
                                          isSourceInConversation
                                            ? 'bg-green-100 border border-green-300'
                                            : isSourceSelected
                                              ? 'bg-blue-100 border border-blue-300'
                                              : 'bg-white border border-blue-100 hover:border-blue-300'
                                        } transition-colors`}
                                      >
                                        <Icon
                                          icon="mdi:file-document"
                                          width="12"
                                          height="12"
                                          className={
                                            isSourceInConversation
                                              ? 'text-green-600'
                                              : isSourceSelected
                                                ? 'text-blue-600'
                                                : 'text-gray-400'
                                          }
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div
                                            className={`text-xs truncate ${
                                              isSourceInConversation
                                                ? 'font-medium text-green-800'
                                                : isSourceSelected
                                                  ? 'font-medium text-blue-800'
                                                  : 'text-gray-700'
                                            }`}
                                          >
                                            {source.title ||
                                              source.name ||
                                              'Untitled'}
                                          </div>
                                        </div>
                                        {isSourceInConversation && (
                                          <Icon
                                            icon="mdi:check-circle"
                                            width="12"
                                            height="12"
                                            className="text-green-600 flex-shrink-0"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </>
      )}
      <div
        className={`flex flex-col bg-blue-200 ${showSourceMenu ? ' rounded-r-2xl rounded-bl-2xl' : 'rounded-2xl'} border border-blue-300 shadow-md p-2`}
      >
        <div className="flex items-center flex-wrap p-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none p-1 overflow-y-auto min-h-[28px] max-h-40"
            placeholder="Ask anything, or type @ to select a library..."
            rows={1}
          />
          {isMentioning && (
            <LibraryMentionPopup
              libraries={filteredLibraries}
              onSelect={handleSelectLibrary}
              selectedIndex={mentionIndex}
            />
          )}
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
