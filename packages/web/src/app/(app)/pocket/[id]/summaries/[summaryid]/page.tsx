'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/common/Button';
import ContentLayout from '@/components/layout/ContentLayout';
import SummaryCard from '@/components/features/summaries/SummaryCard';
import MarkdownComponent from '@/components/MarkdownComponents';

import { useSubscription } from '@/hooks/useEvents';
import { SummaryEpisodeApiResponse } from '@fylr/types';
import axios from '@/utils/axios';

interface SummaryData {
  id: string;
  pocketId: string;
  title: string;
  createdAt: any;
  generated: string;
  episodes: SummaryEpisodeApiResponse[];
}

export default function SummaryPage({
  params,
}: {
  params: Promise<{ id: string; summaryid: string }>;
}) {
  const t = useTranslations('pages.summaries');
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [summaryid, setSummaryid] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
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
    params.then((res) => {
      setPocketId(res.id);
      setSummaryid(res.summaryid);
    });
  }, [params]);

  useEffect(() => {
    if (summaryid) {
      fetchSummary(summaryid);
    }
  }, [summaryid]);

  const fetchSummary = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.get(`summary/${id}`);

      const fetchedData: SummaryData = data;
      setSummaryData(fetchedData);
      if (
        fetchedData.episodes &&
        fetchedData.episodes.length > 0 &&
        !selectedEpisodeId
      ) {
        setSelectedEpisodeId(fetchedData.episodes[0].id);
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

  const routingKey = summaryid ? `summary.${summaryid}.status` : null;

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
  });

  return (
    <ContentLayout
      title={summaryData?.title || 'Loading...'}
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      trailingHeaderActions={<Button text={t('editButton')} />}
      sidebarContent={
        <>
          <p className="text-xl">{t('summaryEpisodes')}</p>
          {generationStatus && (
            <p className="text-sm text-gray-600 animate-pulse">
              {generationStatus}
            </p>
          )}
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            {summaryData?.episodes.map((episode) => (
              <SummaryCard
                key={episode.id}
                fileName={episode.title}
                fileType="episode"
                selected={selectedEpisodeId === episode.id}
                onClick={() => handleEpisodeSelect(episode)}
              />
            ))}
          </div>
        </>
      }
    >
      {isLoading && <p>Loading summary...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!isLoading && !error && selectedEpisode && (
        <MarkdownComponent text={selectedEpisode.content} />
      )}
    </ContentLayout>
  );
}
