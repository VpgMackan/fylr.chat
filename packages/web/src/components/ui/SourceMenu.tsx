import { Icon } from '@iconify/react';
import { SimpleLibrary } from '@/services/api/library.api';

interface SourceMenuProps {
  toggleSourceMenu: () => void;
  isSourceMenuOpen: boolean;
  librariesWithSources: Array<{ library: SimpleLibrary; sources: any[] }>;
  getConversationSourceIds: () => Set<string>;
  getSelectedSourceIds: () => Set<string>;
  isLibrarySelected: (libraryId: string) => boolean;
  toggleLibrary: (libraryId: string) => void;
  expandedLibraries: Set<string>;
}

export default function SourceMenu({
  toggleSourceMenu,
  isSourceMenuOpen,
  librariesWithSources,
  getConversationSourceIds,
  getSelectedSourceIds,
  isLibrarySelected,
  toggleLibrary,
  expandedLibraries,
}: SourceMenuProps) {
  return (
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
                      className={`bg-white rounded-md border ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-blue-200'
                      } overflow-hidden`}
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
                            className={`text-xs font-medium ${
                              isSelected ? 'text-blue-700' : 'text-gray-800'
                            }`}
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
                                const isSourceSelected = selectedSourceIds.has(
                                  source.id,
                                );

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
  );
}
