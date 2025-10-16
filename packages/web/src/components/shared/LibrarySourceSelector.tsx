import { Icon } from '@iconify/react';
import { SimpleLibrary } from '@/services/api/library.api';
import { SourceApiResponse } from '@fylr/types';

interface LibrarySourceSelectorProps {
  libraries: SimpleLibrary[];
  expandedLibraries: Set<string>;
  librarySources: Record<string, SourceApiResponse[]>;
  loadingSources: Set<string>;
  selectedLibraries: Set<string>;
  selectedSources: Set<string>;
  isCreating: boolean;
  onToggleLibraryExpansion: (libraryId: string) => void;
  onToggleLibrarySelection: (libraryId: string) => void;
  onToggleSourceSelection: (sourceId: string, libraryId: string) => void;
  isLibraryFullySelected: (libraryId: string) => boolean;
  isLibraryPartiallySelected: (libraryId: string) => boolean;
  onClearAll: () => void;
}

export default function LibrarySourceSelector({
  libraries,
  expandedLibraries,
  librarySources,
  loadingSources,
  selectedLibraries,
  selectedSources,
  isCreating,
  onToggleLibraryExpansion,
  onToggleLibrarySelection,
  onToggleSourceSelection,
  isLibraryFullySelected,
  isLibraryPartiallySelected,
  onClearAll,
}: LibrarySourceSelectorProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Select Libraries & Sources
        </label>
        {(selectedLibraries.size > 0 || selectedSources.size > 0) && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={isCreating}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:text-gray-400 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Selection Summary */}
      {(selectedLibraries.size > 0 || selectedSources.size > 0) && (
        <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-gray-700">
            <span className="font-medium">Selected:</span>{' '}
            {selectedLibraries.size > 0 && (
              <span>
                {selectedLibraries.size} library
                {selectedLibraries.size === 1 ? '' : 'ies'}
                {selectedSources.size > 0 && ', '}
              </span>
            )}
            {selectedSources.size > 0 && (
              <span>{selectedSources.size} source(s)</span>
            )}
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {libraries.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No libraries available
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {libraries.map((library) => (
              <div key={library.id}>
                {/* Library Header */}
                <div className="flex items-center px-3 py-2.5 hover:bg-gray-50 transition-colors">
                  {/* Library Checkbox */}
                  <div className="flex items-center flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isLibraryFullySelected(library.id)}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = isLibraryPartiallySelected(
                            library.id,
                          );
                        }
                      }}
                      onChange={() => onToggleLibrarySelection(library.id)}
                      disabled={isCreating}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 mr-2.5 flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {library.title}
                    </span>
                  </div>

                  {/* Expand/Collapse Button */}
                  <button
                    type="button"
                    onClick={() => onToggleLibraryExpansion(library.id)}
                    disabled={isCreating}
                    className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    aria-label={
                      expandedLibraries.has(library.id) ? 'Collapse' : 'Expand'
                    }
                  >
                    <Icon
                      icon={
                        expandedLibraries.has(library.id)
                          ? 'akar-icons:chevron-up'
                          : 'akar-icons:chevron-down'
                      }
                      className="w-4 h-4 text-gray-500"
                    />
                  </button>
                </div>

                {/* Sources List */}
                {expandedLibraries.has(library.id) && (
                  <div className="bg-gray-50 border-t border-gray-200">
                    {loadingSources.has(library.id) ? (
                      <div className="px-3 py-3 text-xs text-gray-500 text-center">
                        Loading sources...
                      </div>
                    ) : librarySources[library.id]?.length ? (
                      <div className="py-1">
                        {librarySources[library.id].map((source) => (
                          <label
                            key={source.id}
                            className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSources.has(source.id)}
                              onChange={() =>
                                onToggleSourceSelection(source.id, library.id)
                              }
                              disabled={isCreating}
                              className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 mr-2.5 flex-shrink-0 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700 truncate group-hover:text-gray-900">
                              {source.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-3 text-xs text-gray-500 text-center">
                        No sources in this library
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
