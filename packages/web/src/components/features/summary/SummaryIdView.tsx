'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import EpisodeLayout from '@/components/layout/EpisodeLayout';
import Button from '@/components/ui/Button';
import ItemSettingsModal from '@/components/modals/ItemSettingsModal';
import MarkdownComponent from '@/components/ui/MarkdownComponents';
import { useEpisodeManager } from '@/hooks/useEpisodeManager';
import {
  getSummaryById,
  updateSummary,
  deleteSummary,
} from '@/services/api/summary.api';
import { SummaryApiResponse } from '@fylr/types';

export default function SummaryIdViewRefactored() {
  const params = useParams();
  const summaryId = params.summaryid as string;
  const router = useRouter();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const {
    data: summaryData,
    selectedEpisode,
    selectedEpisodeId,
    isLoading,
    error,
    generationStatus,
    handleEpisodeSelect,
    refetch,
  } = useEpisodeManager<SummaryApiResponse['episodes'][0]>({
    resourceId: summaryId,
    resourceType: 'summary',
    fetchFunction: getSummaryById,
  });

  const handleRename = async (newName: string) => {
    try {
      await updateSummary(summaryId, { title: newName });
      toast.success('Summary renamed successfully!');
      refetch?.(); // Re-fetch data to update the title
    } catch (error) {
      console.error('Failed to rename summary', error);
      throw error; // Re-throw to let modal handle the error state
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSummary(summaryId);
      toast.success('Summary deleted successfully!');
      router.push('/'); // Navigate away after deletion
    } catch (error) {
      console.error('Failed to delete summary', error);
      throw error; // Re-throw to let modal handle the error state
    }
  };

  const headerActions = (
    <Button
      name=""
      icon="ph:gear-fill"
      variant="ghost"
      onClick={() => setIsSettingsOpen(true)}
    />
  );

  return (
    <>
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
        headerActions={headerActions}
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

      {/* Settings Modal */}
      {summaryData && (
        <ItemSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentItemName={summaryData.title}
          itemType="summary"
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
