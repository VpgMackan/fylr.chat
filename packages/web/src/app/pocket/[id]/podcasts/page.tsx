'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListPageLayout, {
  DropdownOption,
} from '@/components/layout/ListPageLayout';
import PinnedPod from '@/components/PodcastListItem';

export default function PodcastsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations('pages.podcastList');
  const commonT = useTranslations('common');

  useEffect(() => {
    params.then((res) => setId(res.id));
  }, [params]);

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t('mostRecent') },
    { value: 2, label: t('title') },
    { value: 3, label: t('created') },
  ];

  return (
    <ListPageLayout
      title={t('yourPodcasts', { pocketName: 'Lorem' })}
      onBack={() => router.back()}
      onCreate={() => router.push('/pocket/new')}
      createText={commonT('buttons.create')}
      searchLabel={t('searchLabel')}
      clearSearchLabel={t('clearSearchLabel')}
      dropdownOptions={dropdownOptions}
    >
      <PinnedPod title="🧠 Lorem" pocket="Lorem" />
    </ListPageLayout>
  );
}
