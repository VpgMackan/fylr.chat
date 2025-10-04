'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, Key } from 'react';
import { useRouter } from 'next/navigation';
import ListPageLayout, {
  DropdownOption,
} from '@/components/layout/ListPageLayout';

import CreatePodcastModal from '@/components/modals/CreatePodcastModal';
import { getPodcastByPocketId } from '@/services/api/podcast.api';

import PinnedPod from '@/components/PodcastListItem';
import PinnedPodSkeletion from '@/components/loading/PodcastListItemSkeletion';

export default function PodcastsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('pages.podcastList');
  const commonT = useTranslations('common');

  useEffect(() => {
    params.then((res) => setPocketId(res.id));
  }, [params]);

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t('mostRecent') },
    { value: 2, label: t('title') },
    { value: 3, label: t('created') },
  ];

  const handlePodcastCreated = (podcastId: string) => {
    if (pocketId) {
      router.push(`/pocket/${pocketId}/podcasts/${podcastId}`);
    }
  };

  const dataLoader = pocketId
    ? (params: { take: number; offset: number; searchTerm: string }) =>
        getPodcastByPocketId(pocketId, params)
    : undefined;

  const renderItems = (items: any[]) =>
    items.map((podcast) => (
      <PinnedPod
        title={podcast.title}
        pocket="Current Pocket"
        id={podcast.id}
        pocketId={pocketId || ''}
      />
    ));

  return (
    <>
      <ListPageLayout
        title={t('yourPodcasts', { pocketName: 'Lorem' })}
        onBack={() => router.back()}
        onCreate={() => setIsModalOpen(true)}
        createText={commonT('buttons.create')}
        searchLabel={t('searchLabel')}
        clearSearchLabel={t('clearSearchLabel')}
        dropdownOptions={dropdownOptions}
        dataLoader={dataLoader}
        skeleton={<PinnedPodSkeletion />}
        renderItems={renderItems}
      />
      {pocketId && (
        <CreatePodcastModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pocketId={pocketId}
          onSuccess={handlePodcastCreated}
        />
      )}
    </>
  );
}
