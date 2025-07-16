'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/common/Button';
import Source from '@/components/SourceListItem';
import PinnedPod from '@/components/PodcastListItem';
import Chat from '@/components/ChatListItem';
import EditPocketDialog from '@/components/EditPocketDialog';
import Heading from '@/components/layout/Heading';
import Section from '@/components/layout/Section';
import SourceSkeleton from '@/components/loading/SourceListItemSkeleton';
import { getPocketById, updatePocket } from '@/services/api/pocket.api';
import { SourceApiResponse } from '@fylr/types';

export default function PocketIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pocketName, setPocketName] = useState('');
  const [pocketDescription, setPocketDescription] = useState('');
  const [pocketTags, setPocketTags] = useState('');
  const [originalPocket, setOriginalPocket] = useState({
    title: '',
    description: '',
    tags: '',
  });

  const [sources, setSources] = useState<SourceApiResponse[] | null>(null);

  const router = useRouter();

  const common = useTranslations('common');
  const sourcesT = useTranslations('sources');
  const t = useTranslations('pages');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(async (res) => {
      setId(res.id);
      try {
        const pocketData = await getPocketById(res.id);
        setPocketName(pocketData.title);
        setPocketDescription(pocketData.description);
        setPocketTags(pocketData.tags.join(','));
        setSources(pocketData.sources);

        setOriginalPocket({
          title: pocketData.title,
          description: pocketData.description,
          tags: pocketData.tags.join(','),
        });

        setLoading(false);
      } catch (err: unknown) {
        console.error(err);
      }
    });
  }, [params]);

  const handleSavePocket = () => {
    const data: Record<string, string> = {};
    if (pocketName !== originalPocket.title) {
      data.title = pocketName;
    }
    if (pocketDescription !== originalPocket.description) {
      data.description = pocketDescription;
    }
    if (pocketTags !== originalPocket.tags) {
      data.tags = pocketTags;
    }

    if (Object.keys(data).length === 0) return;
    if (id) {
      updatePocket(id, data)
        .then(() => {
          setOriginalPocket({
            title: pocketName,
            description: pocketDescription,
            tags: pocketTags,
          });
        })
        .catch((error) => {
          console.error('Failed to update pocket:', error);
        });
    }
  };

  return (
    <Heading
      title={pocketName}
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      trailingHeaderActions={
        <Button
          text={t('pocketDetail.editPocket')}
          className="mr-2"
          onClick={() => setIsEditModalOpen(true)}
        />
      }
    >
      <EditPocketDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        pocketName={pocketName}
        pocketDescription={pocketDescription}
        pocketTags={pocketTags}
        setPocketName={setPocketName}
        setPocketDescription={setPocketDescription}
        setPocketTags={setPocketTags}
        onSave={handleSavePocket}
      />

      <Section
        title={sourcesT('labels.yourSources')}
        actions={
          <Button
            text={common('buttons.viewAll')}
            className="mr-2"
            onClick={() => router.push('/pocket/' + id + '/sources')}
          />
        }
        cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
      >
        {loading
          ? Array.from(
              { length: Math.floor(Math.random() * 6) + 1 },
              (_, index) => <SourceSkeleton key={index} />,
            )
          : sources?.map(({ id, name, size, pocketId }) => (
              <Source
                key={id}
                title={name}
                summary="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
                size={size}
                imported="2025/04/13"
                id={id}
                pocketId={pocketId}
              />
            ))}
      </Section>

      <Section
        title={t('pocketDetail.mostRecent')}
        cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
      >
        <Source
          title="🧠 Lorem"
          summary="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          size="2.4 KB"
          imported="2025/04/13"
          id="e57b8ddd-c118-43cf-a595-067579b62b97"
          pocketId={id || ''}
        />
        <PinnedPod title="Lorem ipsum" pocket="Lorem" />
        <Chat title="Lorem ipsum" pocket="Lorem" id="temp" />
        <Chat title="Lorem ipsum" pocket="Lorem" id="temp" />
      </Section>

      <Section title={t('pocketDetail.shortcuts')} cols="grid-cols-3">
        <Button
          text={t('pocketDetail.viewChats')}
          onClick={() => router.push('/pocket/' + id + '/chats')}
        />
        <Button
          text={t('pocketDetail.viewSummaries')}
          onClick={() => router.push('/pocket/' + id + '/summaries')}
        />
        <Button
          text={t('pocketDetail.viewPodcasts')}
          onClick={() => router.push('/pocket/' + id + '/podcasts')}
        />
      </Section>
    </Heading>
  );
}
