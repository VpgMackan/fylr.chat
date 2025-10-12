'use client';

import {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';
import { getSourcesByLibraryId } from '@/services/api/source.api';
import { listLibraries, SimpleLibrary } from '@/services/api/library.api';
import { SourceApiResponse } from '@fylr/types';

export interface CreateSummaryContentRef {
  handleCreate: () => Promise<void>;
  isCreating: boolean;
  canCreate: boolean;
}

interface EpisodeData {
  title: string;
  focus?: string;
}

const CreateSummaryContent = forwardRef<CreateSummaryContentRef>(
  (props, ref) => {
    const [summaryName, setSummaryName] = useState('');
    const [libraries, setLibraries] = useState<SimpleLibrary[]>([]);
    const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(
      new Set(),
    );
    const [librarySources, setLibrarySources] = useState<
      Record<string, SourceApiResponse[]>
    >({});
    const [loadingSources, setLoadingSources] = useState<Set<string>>(
      new Set(),
    );
    const [selectedLibraries, setSelectedLibraries] = useState<Set<string>>(
      new Set(),
    );
    const [selectedSources, setSelectedSources] = useState<Set<string>>(
      new Set(),
    );
    const [episodes, setEpisodes] = useState<EpisodeData[]>([
      { title: '', focus: '' },
    ]);

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
      const fetchLibraries = async () => {
        try {
          const libs = await listLibraries();
          setLibraries(libs);
        } catch (err) {
          console.error('Failed to fetch libraries', err);
        }
      };
      void fetchLibraries();
    }, []);

    const fetchSourcesForLibrary = useCallback(
      async (libraryId: string) => {
        if (librarySources[libraryId]) {
          return;
        }

        setLoadingSources((prev) => new Set(prev).add(libraryId));
        try {
          const sources = await getSourcesByLibraryId(libraryId);
          setLibrarySources((prev) => ({
            ...prev,
            [libraryId]: sources,
          }));
        } catch (err) {
          console.error('Failed to fetch sources for library', libraryId, err);
        } finally {
          setLoadingSources((prev) => {
            const newSet = new Set(prev);
            newSet.delete(libraryId);
            return newSet;
          });
        }
      },
      [librarySources],
    );

    const toggleLibraryExpansion = useCallback(
      async (libraryId: string) => {
        const newExpanded = new Set(expandedLibraries);
        if (expandedLibraries.has(libraryId)) {
          newExpanded.delete(libraryId);
        } else {
          newExpanded.add(libraryId);
          await fetchSourcesForLibrary(libraryId);
        }
        setExpandedLibraries(newExpanded);
      },
      [expandedLibraries, fetchSourcesForLibrary],
    );

    const toggleLibrarySelection = useCallback(
      async (libraryId: string) => {
        const newSelectedLibraries = new Set(selectedLibraries);
        const newSelectedSources = new Set(selectedSources);

        // Fetch sources if not already loaded
        if (!librarySources[libraryId]) {
          await fetchSourcesForLibrary(libraryId);
        }

        const sources = librarySources[libraryId] || [];

        if (selectedLibraries.has(libraryId)) {
          // Deselect library and ALL its sources
          newSelectedLibraries.delete(libraryId);
          sources.forEach((source) => newSelectedSources.delete(source.id));
        } else {
          // Select library and all its sources
          newSelectedLibraries.add(libraryId);
          sources.forEach((source) => newSelectedSources.add(source.id));
        }

        setSelectedLibraries(newSelectedLibraries);
        setSelectedSources(newSelectedSources);
      },
      [
        selectedLibraries,
        selectedSources,
        librarySources,
        fetchSourcesForLibrary,
      ],
    );

    const toggleSourceSelection = useCallback(
      (sourceId: string, libraryId: string) => {
        const newSelectedSources = new Set(selectedSources);
        const newSelectedLibraries = new Set(selectedLibraries);
        const librarySrcs = librarySources[libraryId] || [];

        if (selectedSources.has(sourceId)) {
          // Deselect source
          newSelectedSources.delete(sourceId);

          // Check if any sources in this library are still selected
          const anySourceSelected = librarySrcs.some(
            (src) => src.id !== sourceId && newSelectedSources.has(src.id),
          );

          // If no sources are selected in this library, deselect the library
          if (!anySourceSelected) {
            newSelectedLibraries.delete(libraryId);
          } else {
            // Some sources still selected but not all, so deselect library
            newSelectedLibraries.delete(libraryId);
          }
        } else {
          // Select source
          newSelectedSources.add(sourceId);

          // Check if all sources in this library are now selected
          const allSourcesSelected = librarySrcs.every((src) =>
            newSelectedSources.has(src.id),
          );

          // If all sources are selected, select the library; otherwise keep it deselected
          if (allSourcesSelected) {
            newSelectedLibraries.add(libraryId);
          }
        }

        setSelectedSources(newSelectedSources);
        setSelectedLibraries(newSelectedLibraries);
      },
      [selectedSources, selectedLibraries, librarySources],
    );

    const isLibraryFullySelected = useCallback(
      (libraryId: string) => {
        return selectedLibraries.has(libraryId);
      },
      [selectedLibraries],
    );

    const isLibraryPartiallySelected = useCallback(
      (libraryId: string) => {
        const sources = librarySources[libraryId] || [];
        if (sources.length === 0) return false;

        const selectedCount = sources.filter((src) =>
          selectedSources.has(src.id),
        ).length;

        return selectedCount > 0 && selectedCount < sources.length;
      },
      [librarySources, selectedSources],
    );

    const handleCreate = async () => {
      setIsCreating(true);
      setError(null);

      try {
        // Filter out empty episodes
        const validEpisodes = episodes.filter(
          (ep) => ep.title.trim().length > 0,
        );

        if (validEpisodes.length === 0) {
          throw new Error('At least one episode with a title is required');
        }

        if (selectedLibraries.size === 0 && selectedSources.size === 0) {
          throw new Error('Please select at least one library or source');
        }

        // Only include sources that are not part of a fully selected library
        // to avoid duplication in the backend
        const sourcesNotInSelectedLibraries = Array.from(
          selectedSources,
        ).filter((sourceId) => {
          // Find which library this source belongs to
          const libraryId = Object.keys(librarySources).find((libId) =>
            librarySources[libId]?.some((src) => src.id === sourceId),
          );
          // Include source only if its library is not fully selected
          return libraryId && !selectedLibraries.has(libraryId);
        });

        const payload = {
          title: summaryName,
          episodes: validEpisodes,
          libraryIds: Array.from(selectedLibraries),
          sourceIds: sourcesNotInSelectedLibraries,
        };

        const response = await axios.post('/summary', payload);
        router.push(`/summary/${response.data.id}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred while creating the summary',
        );
        throw err;
      } finally {
        setIsCreating(false);
      }
    };

    const canCreate =
      summaryName.trim().length > 0 &&
      episodes.some((ep) => ep.title.trim().length > 0) &&
      (selectedLibraries.size > 0 || selectedSources.size > 0);

    useImperativeHandle(ref, () => ({
      handleCreate,
      isCreating,
      canCreate,
    }));

    const addEpisode = () => {
      setEpisodes([...episodes, { title: '', focus: '' }]);
    };

    const removeEpisode = (index: number) => {
      if (episodes.length > 1) {
        setEpisodes(episodes.filter((_, i) => i !== index));
      }
    };

    const updateEpisode = (
      index: number,
      field: keyof EpisodeData,
      value: string,
    ) => {
      const newEpisodes = [...episodes];
      newEpisodes[index][field] = value;
      setEpisodes(newEpisodes);
    };

    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-1">Create New Summary</h2>
          <p className="text-sm text-gray-600">
            Create a new summary to quickly understand different topics
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-5">
          {/* Summary Name */}
          <div>
            <label
              htmlFor="summary-name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Summary Name
            </label>
            <input
              id="summary-name"
              type="text"
              value={summaryName}
              onChange={(e) => setSummaryName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter summary name"
              required
              disabled={isCreating}
            />
          </div>

          {/* Episodes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Episodes
              </label>
              <button
                type="button"
                onClick={addEpisode}
                disabled={isCreating}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors"
              >
                <Icon icon="akar-icons:plus" className="w-3.5 h-3.5" />
                Add Episode
              </button>
            </div>
            <div className="space-y-2.5">
              {episodes.map((episode, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-2.5 space-y-2 bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">
                      Episode {index + 1}
                    </span>
                    {episodes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEpisode(index)}
                        disabled={isCreating}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-400 transition-colors"
                        aria-label="Remove episode"
                      >
                        <Icon icon="akar-icons:cross" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={episode.title}
                    onChange={(e) =>
                      updateEpisode(index, 'title', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Episode title"
                    disabled={isCreating}
                  />
                  <input
                    type="text"
                    value={episode.focus || ''}
                    onChange={(e) =>
                      updateEpisode(index, 'focus', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Focus (optional)"
                    disabled={isCreating}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Libraries and Sources Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Libraries & Sources
              </label>
              {(selectedLibraries.size > 0 || selectedSources.size > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLibraries(new Set());
                    setSelectedSources(new Set());
                  }}
                  disabled={isCreating}
                  className="text-xs font-medium text-red-600 hover:text-red-700 disabled:text-gray-400 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selection Summary - Moved to top */}
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
                            onChange={() => toggleLibrarySelection(library.id)}
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
                          onClick={() => toggleLibraryExpansion(library.id)}
                          disabled={isCreating}
                          className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                          aria-label={
                            expandedLibraries.has(library.id)
                              ? 'Collapse'
                              : 'Expand'
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
                                      toggleSourceSelection(
                                        source.id,
                                        library.id,
                                      )
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
        </div>
      </div>
    );
  },
);

CreateSummaryContent.displayName = 'CreateSummaryContent';

export default CreateSummaryContent;
