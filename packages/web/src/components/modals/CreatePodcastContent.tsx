'use client';

import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/utils/axios';
import { useLibrarySelection } from '@/hooks/useLibrarySelection';
import LibrarySourceSelector from '@/components/shared/LibrarySourceSelector';

export interface CreatePodcastContentRef {
  handleCreate: () => Promise<void>;
  isCreating: boolean;
  canCreate: boolean;
}

interface CreatePodcastContentProps {
  onCanCreateChange: (canCreate: boolean) => void;
}

const CreatePodcastContent = forwardRef<
  CreatePodcastContentRef,
  CreatePodcastContentProps
>(({ onCanCreateChange }, ref) => {
  const [podcastName, setPodcastName] = useState('');
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
    podcastName.trim().length > 0 &&
    (selectedLibraries.size > 0 || selectedSources.size > 0);

  useEffect(() => {
    onCanCreateChange(canCreate);
  }, [canCreate, onCanCreateChange]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      if (selectedLibraries.size === 0 && selectedSources.size === 0) {
        throw new Error('Please select at least one library or source');
      }

      const payload = {
        title: podcastName,
        libraryIds: Array.from(selectedLibraries),
        sourceIds: getSourcesNotInSelectedLibraries(),
      };

      const response = await axios.post('/podcast', payload);
      router.push(`/podcast/${response.data.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while creating the podcast',
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

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold mb-1">Create New Podcast</h2>
        <p className="text-sm text-gray-600">
          Create a new podcast to quickly understand different topics
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 space-y-5">
        {/* Podcast Name */}
        <div>
          <label
            htmlFor="podcast-name"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Podcast Name
          </label>
          <input
            id="podcast-name"
            type="text"
            value={podcastName}
            onChange={(e) => setPodcastName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter podcast name"
            required
            disabled={isCreating}
          />
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

CreatePodcastContent.displayName = 'CreatePodcastContent';

export default CreatePodcastContent;
