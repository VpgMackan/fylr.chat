'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'react-hot-toast';

import { getSummaryById } from '@/services/api/summary.api';
import { useSubscription } from '@/hooks/useEvents';
import { SummaryApiResponse, SummaryEpisodeApiResponse } from '@fylr/types';
import MarkdownComponent from '@/components/ui/MarkdownComponents';

export default function SummaryIdPageView() {
  const params = useParams();
  const summaryId = params.summaryid as string;

  const [summaryData, setSummaryData] = useState<SummaryApiResponse | null>(
    null,
  );
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedEpisode = summaryData?.episodes.find(
    (ep) => ep.id === selectedEpisodeId,
  );

  useEffect(() => {
    if (summaryId) {
      fetchSummary(summaryId);
    }
  }, [summaryId]);

  const fetchSummary = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getSummaryById(summaryId);

      setSummaryData(data);
      if (data.episodes && data.episodes.length > 0 && !selectedEpisodeId) {
        setSelectedEpisodeId(data.episodes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEpisodeSelect = (episode: SummaryEpisodeApiResponse) => {
    setSelectedEpisodeId(episode.id);
  };

  const routingKey = summaryId ? `summary.${summaryId}.status` : null;

  useSubscription(routingKey, (eventData: any) => {
    console.log('Received summary update:', eventData);
    setGenerationStatus(eventData.message);

    if (eventData.stage === 'episode_complete') {
      const updatedEpisode = eventData.episode;
      setSummaryData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          episodes: prevData.episodes.map((ep) =>
            ep.id === updatedEpisode.id
              ? { ...ep, content: updatedEpisode.content }
              : ep,
          ),
        };
      });
    }
    if (eventData.stage === 'complete') {
      setGenerationStatus(
        `Summary generation ${eventData.finalStatus?.toLowerCase()}.`,
      );
      setSummaryData((prevData) =>
        prevData ? { ...prevData, generated: eventData.finalStatus } : null,
      );
    }

    if (eventData.stage === 'error') {
      toast.error(`Summary generation failed: ${eventData.message}`);
      setGenerationStatus(`Error: ${eventData.message}`);
    }

    if (eventData.stage === 'complete' && eventData.finalStatus === 'FAILED') {
      toast.error('Summary generation finished with an error.');
    }
  });

  return (
    <div>
      {isLoading && <p>Loading summary...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!isLoading && !error && selectedEpisode && (
        <MarkdownComponent text={selectedEpisode.content} />
      )}
    </div>
  );
}
