'use client';

import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { toast } from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';

import EpisodeLayout from '@/components/layout/EpisodeLayout';
import Button from '@/components/ui/Button';
import ItemSettingsModal from '@/components/modals/ItemSettingsModal';
import { useEpisodeManager } from '@/hooks/useEpisodeManager';
import {
  getPodcastById,
  updatePodcast,
  deletePodcast,
} from '@/services/api/podcast.api';
import { PodcastEpisodeApiResponse } from '@fylr/types';

export default function PodcastIdViewRefactored() {
  const params = useParams();
  const podcastId = params.podcastid as string;
  const router = useRouter();

  const [playing, setPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    data: podcastData,
    selectedEpisode,
    selectedEpisodeId,
    isLoading,
    error,
    generationStatus,
    handleEpisodeSelect,
    refetch,
  } = useEpisodeManager<PodcastEpisodeApiResponse>({
    resourceId: podcastId,
    resourceType: 'podcast',
    fetchFunction: getPodcastById,
    onEpisodeUpdate: () => {
      // Reset audio when episode updates
      setCurrentTime(0);
      setPlaying(false);
      if (audioRef.current) {
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }
    },
  });

  const handleEpisodeSelectWithAudioReset = (
    episode: PodcastEpisodeApiResponse,
  ) => {
    handleEpisodeSelect(episode);
    // Reset audio when changing episodes
    setCurrentTime(0);
    setPlaying(false);
    if (audioRef.current) {
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
  };

  // Audio player functions
  const audioUrl =
    selectedEpisode?.audioKey && podcastId && selectedEpisodeId
      ? `${process.env.NEXT_PUBLIC_API_URL}/podcast/${podcastId}/audio?episodeId=${selectedEpisodeId}`
      : null;

  const handlePlayPause = async () => {
    if (!selectedEpisode?.audioKey || !audioUrl) {
      return;
    }

    try {
      if (playing) {
        audioRef.current?.pause();
        setPlaying(false);
      } else {
        if (!audioRef.current?.src || audioRef.current.src !== audioUrl) {
          const response = await fetch(audioUrl, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const audioBlob = await response.blob();
          const blobUrl = URL.createObjectURL(audioBlob);

          if (audioRef.current) {
            audioRef.current.src = blobUrl;
            audioRef.current.volume = volume;
          }
        }

        await audioRef.current?.play();
        setPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
      setPlaying(false);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(event.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(event.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.volume = volume;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  const handleDownload = async () => {
    if (!selectedEpisode?.audioKey || !audioUrl) {
      toast.error('No audio available to download');
      return;
    }

    try {
      const response = await fetch(audioUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${selectedEpisode.title || 'podcast-episode'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);

      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading audio:', error);
      toast.error('Failed to download audio');
    }
  };

  const handleRename = async (newName: string) => {
    try {
      await updatePodcast(podcastId, { title: newName });
      toast.success('Podcast renamed successfully!');
      refetch?.(); // Re-fetch data to update the title
    } catch (error) {
      console.error('Failed to rename podcast', error);
      throw error; // Re-throw to let modal handle the error state
    }
  };

  const handleDelete = async () => {
    try {
      await deletePodcast(podcastId);
      toast.success('Podcast deleted successfully!');
      router.push('/'); // Navigate away after deletion
    } catch (error) {
      console.error('Failed to delete podcast', error);
      throw error; // Re-throw to let modal handle the error state
    }
  };

  // Custom episode card with microphone icon
  const renderEpisodeCard = (
    episode: PodcastEpisodeApiResponse,
    isSelected: boolean,
    onClick: () => void,
  ) => {
    const color = isSelected
      ? 'bg-blue-400 hover:bg-blue-300'
      : 'bg-blue-200 hover:bg-blue-300';

    return (
      <div
        key={episode.id}
        onClick={onClick}
        className={`flex ${color} transition-colors duration-150 rounded-lg border border-blue-400 p-3 justify-between items-center cursor-pointer`}
      >
        <Icon
          icon="ph:microphone-fill"
          width="20"
          height="20"
          className="text-blue-700"
        />
        <p className="text-sm font-medium text-gray-800 truncate flex-1 ml-2">
          {episode.title}
        </p>
      </div>
    );
  };

  const headerActions = (
    <>
      {/*TODO: <Button name={'Share'} variant="secondary" />*/}
      <Button
        name={'Download'}
        variant="secondary"
        onClick={handleDownload}
        disabled={!selectedEpisode?.audioKey}
      />
      <Button
        name=""
        icon="ph:gear-fill"
        variant="ghost"
        onClick={() => setIsSettingsOpen(true)}
      />
    </>
  );

  return (
    <>
      <EpisodeLayout
        title={podcastData?.title || 'Podcast'}
        episodes={podcastData?.episodes || []}
        selectedEpisodeId={selectedEpisodeId}
        isLoading={isLoading}
        error={error}
        generationStatus={generationStatus}
        onEpisodeSelect={handleEpisodeSelectWithAudioReset}
        sidebarTitle={'Podcast Episodes'}
        episodeIcon="ph:microphone-fill"
        renderEpisodeCard={renderEpisodeCard}
        headerActions={headerActions}
        translations={{
          editButton: 'Edit',
          loadingMessage: 'Loading podcast...',
          errorPrefix: 'Error',
        }}
      >
        {selectedEpisode && (
          <div className="flex flex-col justify-between h-full">
            {/* Episode Title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedEpisode.title}
              </h1>
            </div>

            {/* Audio Player Controls - Centered */}
            <div className="flex gap-4 justify-center items-center mb-8">
              <div
                className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300 transition-colors"
                onClick={() => handleSkip(-15)}
              >
                <Icon
                  icon="fluent:skip-back-15-20-filled"
                  width="24"
                  height="24"
                />
              </div>

              <div
                className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300 transition-colors"
                onClick={() => handleSkip(-10)}
              >
                <Icon icon="fluent:rewind-28-filled" width="32" height="32" />
              </div>

              <div
                className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300 transition-colors"
                onClick={handlePlayPause}
              >
                {playing ? (
                  <Icon icon="fluent:pause-28-filled" width="52" height="52" />
                ) : (
                  <Icon icon="fluent:play-28-filled" width="52" height="52" />
                )}
              </div>

              <div
                className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300 transition-colors"
                onClick={() => handleSkip(10)}
              >
                <Icon
                  icon="fluent:fast-forward-28-filled"
                  width="32"
                  height="32"
                />
              </div>

              <div
                className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300 transition-colors"
                onClick={() => handleSkip(15)}
              >
                <Icon
                  icon="fluent:skip-forward-15-20-20-filled"
                  width="24"
                  height="24"
                />
              </div>
            </div>

            {/* Audio Progress Bar and Volume Controls */}
            <div className="flex items-center gap-4 bg-blue-200 rounded-2xl p-4">
              {/* Progress Bar Section */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-sm text-left">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-sm text-right">
                    {formatTime(duration)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Volume Controls Section */}
              <div className="flex items-center gap-2 min-w-fit">
                <Icon
                  icon="fluent:speaker-2-20-filled"
                  width="20"
                  height="20"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Hidden Audio Element */}
            <audio
              ref={audioRef}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setPlaying(false)}
              onError={(e) => {
                console.error('Audio error:', e);
                toast.error('Failed to load audio');
                setPlaying(false);
              }}
            />
          </div>
        )}
      </EpisodeLayout>

      {/* Settings Modal */}
      {podcastData && (
        <ItemSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentItemName={podcastData.title}
          itemType="podcast"
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
