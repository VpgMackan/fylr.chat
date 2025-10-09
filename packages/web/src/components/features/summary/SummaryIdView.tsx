'use client';

import { useParams } from 'next/navigation';

import EpisodeLayout from '@/components/layout/EpisodeLayout';
import MarkdownComponent from '@/components/ui/MarkdownComponents';
import { useEpisodeManager } from '@/hooks/useEpisodeManager';
import { getSummaryById } from '@/services/api/summary.api';
import { SummaryApiResponse } from '@fylr/types';

export default function SummaryIdViewRefactored() {
  const params = useParams();
  const summaryId = params.summaryid as string;

  const {
    data: summaryData,
    selectedEpisode,
    selectedEpisodeId,
    isLoading,
    error,
    generationStatus,
    handleEpisodeSelect,
  } = useEpisodeManager<SummaryApiResponse['episodes'][0]>({
    resourceId: summaryId,
    resourceType: 'summary',
    fetchFunction: getSummaryById,
  });

  return (
    <EpisodeLayout
      title={summaryData?.title || 'Summary'}
      episodes={summaryData?.episodes || []}
      selectedEpisodeId={selectedEpisodeId}
      isLoading={isLoading}
      error={error}
      generationStatus={generationStatus}
      onEpisodeSelect={handleEpisodeSelect}
      sidebarTitle={'Summary Episodes'}
      episodeIcon="ph:file-fill"
      translations={{
        editButton: 'Edit',
        loadingMessage: 'Loading summary...',
        errorPrefix: 'Error',
      }}
    >
      {selectedEpisode ? (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedEpisode.title}
          </h1>
          <MarkdownComponent text={selectedEpisode.content} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p>{'Select an episode to view its content'}</p>
          </div>
        </div>
      )}
    </EpisodeLayout>
  );
}
