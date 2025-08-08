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

import axios from '@/utils/axios';

interface Episode {
  id: string;
  summaryId: string;
  content: string;
  createdAt: any;
  title: string;
  focus?: string;
}

interface SummaryData {
  id: string;
  pocketId: string;
  title: string;
  createdAt: any;
  length: string;
  generated: string;
  episodes: Episode[];
}

export default function SummaryPage({
  params,
}: {
  params: Promise<{ id: string; summaryid: string }>;
}) {
  const t = useTranslations('pages.summaries');
  const [_id, setId] = useState<string | null>(null);
  const [summaryid, setSummaryid] = useState<string | null>(null);
  const [summaryContent, setSummaryContent] = useState('');
  const [summaryTitle, setSummaryTitle] = useState('');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
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

      const summaryData: SummaryData = await data;
      setSummaryTitle(summaryData.title || '');
      setSummaryContent(summaryData.generated || '');
      setEpisodes(summaryData.episodes || []);

      if (summaryData.episodes && summaryData.episodes.length > 0) {
        setSelectedEpisodeId(summaryData.episodes[0].id);
        setSummaryContent(summaryData.episodes[0].content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisodeId(episode.id);
    setSummaryContent(episode.content);
  };

  const routingKey = summaryid ? `summary.${summaryid}.status` : null;

  useSubscription(routingKey, (data: any) => {
    console.log('Received summary update:', data);
    if (data?.payload?.summary) {
      setSummaryContent((prev) => prev + data.payload.summary);
    }
    if (data?.payload?.message) {
      console.log('Status:', data.payload.message);
    }
  });

  return (
    <ContentLayout
      title={summaryTitle || 'Loading...'}
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      trailingHeaderActions={<Button text={t('editButton')} />}
      sidebarContent={
        <>
          <p className="text-xl">{t('summaryEpisodes')}</p>
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            {episodes.map((episode) => (
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
      {!isLoading && !error && <MarkdownComponent text={summaryContent} />}
    </ContentLayout>
  );
}
