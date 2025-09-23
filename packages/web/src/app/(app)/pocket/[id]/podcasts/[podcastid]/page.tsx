'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/common/Button';
import ContentLayout from '@/components/layout/ContentLayout';
import PodcastEpisodes from '@/components/features/podcasts/PodcastEpisodes';
import MarkdownComponent from '@/components/MarkdownComponents';

import { useSubscription } from '@/hooks/useEvents';
import { PodcastEpisodeApiResponse, PodcastApiResponse } from '@fylr/types';
import { getPodcastById } from '@/services/api/podcast.api';
import { toast } from 'react-hot-toast';

export default function PodcastIdPage({
  params,
}: {
  params: Promise<{ id: string; podcastid: string }>;
}) {
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [podcastId, setPodcastId] = useState<string | null>(null);
  const [podcastData, setPodcastData] = useState<PodcastApiResponse | null>(
    null,
  );
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio player state
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const router = useRouter();
  const commonT = useTranslations('common');
  const t = useTranslations('pages.podcast');

  const selectedEpisode = podcastData?.episodes.find(
    (ep) => ep.id === selectedEpisodeId,
  );

  useEffect(() => {
    params.then((res) => {
      setPocketId(res.id);
      setPodcastId(res.podcastid);
    });
  }, [params]);

  useEffect(() => {
    if (podcastId) {
      fetchPodcast(podcastId);
    }
  }, [podcastId]);

  const fetchPodcast = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPodcastById(id);
      setPodcastData(data);
      if (data.episodes && data.episodes.length > 0 && !selectedEpisodeId) {
        setSelectedEpisodeId(data.episodes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching podcast:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEpisodeSelect = (episode: PodcastEpisodeApiResponse) => {
    setSelectedEpisodeId(episode.id);
    // Reset audio when changing episodes
    setCurrentTime(0);
    setPlaying(false);
    if (audioRef.current) {
      // Clean up previous blob URL
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
  };

  const routingKey = podcastId ? `podcast.${podcastId}.status` : null;

  useSubscription(routingKey, (eventData: any) => {
    console.log('Received podcast update:', eventData);
    setGenerationStatus(eventData.message);

    if (eventData.stage === 'episode_complete') {
      const updatedEpisode = eventData.episode;
      setPodcastData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          episodes: prevData.episodes.map((ep) =>
            ep.id === updatedEpisode.id
              ? {
                  ...ep,
                  content: updatedEpisode.content,
                  audioKey: updatedEpisode.audioKey,
                }
              : ep,
          ),
        };
      });
    }

    if (eventData.stage === 'complete') {
      setGenerationStatus(
        `Podcast generation ${eventData.finalStatus?.toLowerCase()}.`,
      );
      setPodcastData((prevData) =>
        prevData ? { ...prevData, generated: eventData.finalStatus } : null,
      );
    }

    if (eventData.stage === 'error') {
      toast.error(`Podcast generation failed: ${eventData.message}`);
      setGenerationStatus(`Error: ${eventData.message}`);
    }

    if (eventData.stage === 'complete' && eventData.finalStatus === 'FAILED') {
      toast.error('Podcast generation finished with an error.');
    }
  });

  // Audio player functions
  const handlePlayPause = async () => {
    if (!selectedEpisode?.audioKey) {
      console.log('No audio key for selected episode');
      return;
    }

    if (!audioUrl) {
      console.log('No audio URL generated');
      return;
    }

    try {
      if (playing) {
        audioRef.current?.pause();
        setPlaying(false);
      } else {
        console.log('Attempting to play audio from:', audioUrl);

        // If audio element doesn't have src, fetch and create blob URL
        if (!audioRef.current?.src || audioRef.current.src !== audioUrl) {
          console.log('Fetching audio data...');
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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
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

  const audioUrl =
    selectedEpisode?.audioKey && podcastId && selectedEpisodeId
      ? `${process.env.NEXT_PUBLIC_API_URL}/podcast/${podcastId}/audio?episodeId=${selectedEpisodeId}`
      : null;

  console.log('Audio URL:', audioUrl);
  console.log('Selected Episode:', selectedEpisode);
  console.log('Has audioKey:', selectedEpisode?.audioKey);

  return (
    <ContentLayout
      title={podcastData?.title || 'Loading...'}
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      trailingHeaderActions={<Button text={t('editButton')} />}
      sidebarContent={
        <>
          <p className="text-xl">{t('podcastEpisodes')}</p>
          {generationStatus && (
            <p className="text-sm text-gray-600 animate-pulse">
              {generationStatus}
            </p>
          )}
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            {podcastData?.episodes.map((episode) => (
              <PodcastEpisodes
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
      {isLoading && <p>Loading podcast...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!isLoading && !error && selectedEpisode && (
        <div className="flex flex-col justify-between h-full">
          <div className="flex text-2xl items-center justify-between">
            <p className="font-bold">{selectedEpisode.title}</p>
            <div className="flex">
              <Button text={t('share')} className="mr-2" />
              <Button text={t('download')} className="mr-2" />
              <Button
                text={<Icon icon="ph:gear-fill" width="20" height="20" />}
              />
            </div>
          </div>

          {/* Audio Player Controls - Centered */}
          <div className="flex gap-4 justify-center items-center">
            <div
              className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300"
              onClick={() => handleSkip(-15)}
            >
              <Icon
                icon="fluent:skip-back-15-20-filled"
                width="24"
                height="24"
              />
            </div>

            <div
              className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300"
              onClick={() => handleSkip(-10)}
            >
              <Icon icon="fluent:rewind-28-filled" width="32" height="32" />
            </div>

            <div
              className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300"
              onClick={handlePlayPause}
            >
              {playing ? (
                <Icon icon="fluent:pause-28-filled" width="52" height="52" />
              ) : (
                <Icon icon="fluent:play-28-filled" width="52" height="52" />
              )}
            </div>

            <div
              className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300"
              onClick={() => handleSkip(10)}
            >
              <Icon
                icon="fluent:fast-forward-28-filled"
                width="32"
                height="32"
              />
            </div>

            <div
              className="bg-blue-200 border-2 border-blue-300 rounded-full p-4 cursor-pointer hover:bg-blue-300"
              onClick={() => handleSkip(15)}
            >
              <Icon
                icon="fluent:skip-forward-15-20-20-filled"
                width="24"
                height="24"
              />
            </div>
          </div>

          {/* Audio Progress Bar */}
          <div className="flex items-center gap-2 flex-col">
            <div className="flex justify-between w-full">
              <span className="text-s text-left">
                {formatTime(currentTime)}
              </span>
              <span className="text-s text-right">{formatTime(duration)}</span>
            </div>

            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
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
            onLoadStart={() => console.log('Audio loading started')}
            onCanPlay={() => console.log('Audio can play')}
          />
        </div>
      )}
    </ContentLayout>
  );
}
