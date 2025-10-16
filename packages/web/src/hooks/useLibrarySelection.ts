import { useState, useCallback, useEffect } from 'react';
import { getSourcesByLibraryId } from '@/services/api/source.api';
import { listLibraries, SimpleLibrary } from '@/services/api/library.api';
import { SourceApiResponse } from '@fylr/types';

export function useLibrarySelection() {
  const [libraries, setLibraries] = useState<SimpleLibrary[]>([]);
  const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(
    new Set(),
  );
  const [librarySources, setLibrarySources] = useState<
    Record<string, SourceApiResponse[]>
  >({});
  const [loadingSources, setLoadingSources] = useState<Set<string>>(new Set());
  const [selectedLibraries, setSelectedLibraries] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );

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

  const clearAllSelections = useCallback(() => {
    setSelectedLibraries(new Set());
    setSelectedSources(new Set());
  }, []);

  const getSourcesNotInSelectedLibraries = useCallback(() => {
    return Array.from(selectedSources).filter((sourceId) => {
      const libraryId = Object.keys(librarySources).find((libId) =>
        librarySources[libId]?.some((src) => src.id === sourceId),
      );
      return libraryId && !selectedLibraries.has(libraryId);
    });
  }, [selectedSources, selectedLibraries, librarySources]);

  return {
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
  };
}
