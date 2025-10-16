'use client';

import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';
import { useLibrarySelection } from '@/hooks/useLibrarySelection';
import LibrarySourceSelector from '@/components/shared/LibrarySourceSelector';

export interface CreateSummaryContentRef {
  handleCreate: () => Promise<void>;
  isCreating: boolean;
  canCreate: boolean;
}

interface CreateSummaryContentProps {
  onCanCreateChange: (canCreate: boolean) => void;
}

interface EpisodeData {
  title: string;
  focus?: string;
}

const CreateSummaryContent = forwardRef<
  CreateSummaryContentRef,
  CreateSummaryContentProps
>(({ onCanCreateChange }, ref) => {
  const [summaryName, setSummaryName] = useState('');
  const [episodes, setEpisodes] = useState<EpisodeData[]>([
    { title: '', focus: '' },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    libraries,
    expandedLibraries,
    librarySources,
    loadingSources,
    selectedLibraries,
    selectedSources,
    toggleLibraryExpansion,
    toggleLibrarySelection,
    toggleSourceSelection,
    isLibraryFullySelected,
    isLibraryPartiallySelected,
    clearAllSelections,
    getSourcesNotInSelectedLibraries,
  } = useLibrarySelection();

  const canCreate =
    summaryName.trim().length > 0 &&
    episodes.some((ep) => ep.title.trim().length > 0) &&
    (selectedLibraries.size > 0 || selectedSources.size > 0);

  useEffect(() => {
    onCanCreateChange(canCreate);
  }, [canCreate, onCanCreateChange]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Filter out empty episodes
      const validEpisodes = episodes.filter((ep) => ep.title.trim().length > 0);

      if (validEpisodes.length === 0) {
        throw new Error('At least one episode with a title is required');
      }

      if (selectedLibraries.size === 0 && selectedSources.size === 0) {
        throw new Error('Please select at least one library or source');
      }

      const payload = {
        title: summaryName,
        episodes: validEpisodes,
        libraryIds: Array.from(selectedLibraries),
        sourceIds: getSourcesNotInSelectedLibraries(),
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
        <LibrarySourceSelector
          libraries={libraries}
          expandedLibraries={expandedLibraries}
          librarySources={librarySources}
          loadingSources={loadingSources}
          selectedLibraries={selectedLibraries}
          selectedSources={selectedSources}
          isCreating={isCreating}
          onToggleLibraryExpansion={toggleLibraryExpansion}
          onToggleLibrarySelection={toggleLibrarySelection}
          onToggleSourceSelection={toggleSourceSelection}
          isLibraryFullySelected={isLibraryFullySelected}
          isLibraryPartiallySelected={isLibraryPartiallySelected}
          onClearAll={clearAllSelections}
        />
      </div>
    </div>
  );
});

CreateSummaryContent.displayName = 'CreateSummaryContent';

export default CreateSummaryContent;
