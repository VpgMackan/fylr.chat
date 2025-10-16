'use client';

import { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface Episode {
  id: string;
  title: string;
  content: string;
  [key: string]: any;
}

interface EpisodeLayoutProps<T extends Episode> {
  title: string;
  episodes: T[];
  selectedEpisodeId: string | null;

  isLoading: boolean;
  error: string | null;
  generationStatus: string | null;

  onEpisodeSelect: (episode: T) => void;

  children: ReactNode;

  headerActions?: ReactNode;
  sidebarTitle?: string;
  episodeIcon?: string;
  renderEpisodeCard?: (
    episode: T,
    isSelected: boolean,
    onClick: () => void,
  ) => ReactNode;

  translations?: {
    editButton?: string;
    loadingMessage?: string;
    errorPrefix?: string;
  };
}

export default function EpisodeLayout<T extends Episode>({
  title,
  episodes,
  selectedEpisodeId,
  isLoading,
  error,
  generationStatus,
  onEpisodeSelect,
  children,
  headerActions,
  sidebarTitle = 'Episodes',
  episodeIcon = 'ph:file-fill',
  renderEpisodeCard,
  translations = {},
}: EpisodeLayoutProps<T>) {
  const router = useRouter();

  const {
    editButton = 'Edit',
    loadingMessage = 'Loading...',
    errorPrefix = 'Error',
  } = translations;

  const defaultRenderEpisodeCard = (
    episode: T,
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
          icon={episodeIcon}
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

  const episodeCardRenderer = renderEpisodeCard || defaultRenderEpisodeCard;

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {sidebarTitle}
          </h2>
          {generationStatus && (
            <div className="flex items-center gap-2">
              <Icon
                icon="svg-spinners:pulse-ring"
                width="16"
                height="16"
                className="text-blue-500"
              />
              <p className="text-sm text-gray-600 animate-pulse">
                {generationStatus}
              </p>
            </div>
          )}
        </div>

        <hr className="mb-4 border-gray-300" />

        <div className="flex flex-col gap-2">
          {episodes.map((episode) =>
            episodeCardRenderer(episode, selectedEpisodeId === episode.id, () =>
              onEpisodeSelect(episode),
            ),
          )}

          {episodes.length === 0 && !isLoading && (
            <p className="text-sm text-gray-500 text-center py-8">
              No episodes available
            </p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Icon
              icon="weui:back-outlined"
              width="24"
              height="24"
              onClick={() => router.back()}
              className="cursor-pointer hover:text-blue-600 transition-colors"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              {isLoading ? loadingMessage : title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {headerActions || <Button name={editButton} />}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Icon
                  icon="svg-spinners:3-dots-scale"
                  width="48"
                  height="48"
                  className="mx-auto mb-4"
                />
                <p className="text-gray-600">{loadingMessage}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Icon
                  icon="mdi:alert-circle"
                  width="48"
                  height="48"
                  className="mx-auto mb-4 text-red-500"
                />
                <p className="text-red-600 font-medium mb-2">
                  {errorPrefix}: {error}
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && children}
        </div>
      </main>
    </div>
  );
}
