import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSubscription } from '@/hooks/useEvents';

interface Episode {
  id: string;
  title: string;
  content: string;
  [key: string]: any;
}

interface DataWithEpisodes<T extends Episode> {
  id: string;
  title: string;
  generated: string | null;
  episodes: T[];
  [key: string]: any;
}

interface UseEpisodeManagerOptions<T extends Episode> {
  resourceId: string | null;
  resourceType: 'podcast' | 'summary';
  fetchFunction: (id: string) => Promise<DataWithEpisodes<T>>;
  onEpisodeUpdate?: (episode: T) => void;
}

export function useEpisodeManager<T extends Episode>({
  resourceId,
  resourceType,
  fetchFunction,
  onEpisodeUpdate,
}: UseEpisodeManagerOptions<T>) {
  const [data, setData] = useState<DataWithEpisodes<T> | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

  // Fetch data when resourceId changes
  useEffect(() => {
    if (resourceId) {
      fetchData(resourceId);
    }
  }, [resourceId]);

  const fetchData = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedData = await fetchFunction(id);
      setData(fetchedData);

      if (fetchedData.episodes?.length > 0 && !selectedEpisodeId) {
        setSelectedEpisodeId(fetchedData.episodes[0].id);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error(`Error fetching ${resourceType}:`, err);
      toast.error(`Failed to load ${resourceType}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket subscription for status updates
  const routingKey = resourceId ? `${resourceType}.${resourceId}.status` : null;

  useSubscription(routingKey, (eventData: any) => {
    console.log(`Received ${resourceType} update:`, eventData);
    setGenerationStatus(eventData.message);

    switch (eventData.stage) {
      case 'episode_complete':
        const updatedEpisode = eventData.episode;
        setData((prevData) => {
          if (!prevData) return null;
          return {
            ...prevData,
            episodes: prevData.episodes.map((ep) =>
              ep.id === updatedEpisode.id ? { ...ep, ...updatedEpisode } : ep,
            ),
          };
        });

        if (onEpisodeUpdate) {
          onEpisodeUpdate(updatedEpisode);
        }
        break;

      case 'complete':
        setGenerationStatus(
          `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} generation ${eventData.finalStatus?.toLowerCase()}.`,
        );
        setData((prevData) =>
          prevData ? { ...prevData, generated: eventData.finalStatus } : null,
        );

        if (eventData.finalStatus === 'FAILED') {
          toast.error(
            `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} generation finished with an error.`,
          );
        } else {
          toast.success(
            `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} generation completed successfully!`,
          );
        }
        break;

      case 'error':
        toast.error(
          `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} generation failed: ${eventData.message}`,
        );
        setGenerationStatus(`Error: ${eventData.message}`);
        break;
    }
  });

  const handleEpisodeSelect = (episode: T) => {
    setSelectedEpisodeId(episode.id);
  };

  const selectedEpisode = data?.episodes.find(
    (ep) => ep.id === selectedEpisodeId,
  );

  return {
    data,
    selectedEpisode,
    selectedEpisodeId,
    isLoading,
    error,
    generationStatus,
    handleEpisodeSelect,
    refetch: resourceId ? () => fetchData(resourceId) : undefined,
  };
}
