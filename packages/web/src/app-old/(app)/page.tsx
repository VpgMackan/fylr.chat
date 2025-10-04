'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import Button from '@/components/common/Button';
import Pocket from '@/components/PocketListItem';
import PocketSkeleton from '@/components/loading/PocketListItemSkeleton';
import Chat from '@/components/ChatListItem';
import PinnedPod from '@/components/PodcastListItem';
import Heading from '@/components/layout/Heading';
import Section from '@/components/layout/Section';
import { withAuth } from '@/components/auth/withAuth';
import ChatSkeleton from '@/components/loading/ChatListItemSkeleton';
import { ConversationApiResponse, PocketApiResponse } from '@fylr/types';
import { getPockets } from '@/services/api/pocket.api';
import { getConversations } from '@/services/api/chat.api';

function HomePage() {
  const hasFetched = useRef(false);

  const common = useTranslations('common.buttons');
  const yourPockets = useTranslations('pockets.labels');
  const t = useTranslations('pages.home');
  const router = useRouter();

  const [pockets, setPockets] = useState<PocketApiResponse[]>([]);
  const [recentChats, setRecentChats] = useState<ConversationApiResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      try {
        setPockets(
          await getPockets({
            take: 10,
            offset: 0,
          }),
        );

        setRecentChats(
          await getConversations({
            take: 10,
            offset: 0,
          }),
        );

        setLoading(false);
      } catch (err: unknown) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <Heading
      title={t('welcome', { name: 'Markus' })}
      behindTitle={<Icon icon="twemoji:waving-hand" flip="horizontal" />}
    >
      <Section
        title={yourPockets('yourPockets')}
        actions={
          <>
            <Button
              text={common('viewAll')}
              className="mr-2"
              onClick={() => router.push('/pocket')}
            />
            <Button
              text={common('create')}
              onClick={() => router.push('/pocket/new')}
            />
          </>
        }
        cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
      >
        {loading
          ? Array.from(
              { length: Math.floor(Math.random() * 6) + 1 },
              (_, index) => <PocketSkeleton key={index} />,
            )
          : pockets.map(
              ({
                id,
                description,
                createdAt,
                title,
                icon,
                sources,
              }: PocketApiResponse) => (
                <Pocket
                  key={id}
                  title={title}
                  icon={icon}
                  description={description}
                  sources={sources.length}
                  created={createdAt}
                  id={id}
                />
              ),
            )}
      </Section>

      <Section title={t('mostRecentChat')}>
        {loading
          ? Array.from(
              { length: Math.floor(Math.random() * 3) + 1 },
              (_, index) => <ChatSkeleton key={index} />,
            )
          : recentChats.map(({ id, title, pocket }) => (
              <Chat key={id} title={title} pocket={pocket.title} id={id} />
            ))}
      </Section>

      <Section title={t('pinnedPodcasts')}>
        <PinnedPod title="Lorem ipsum" pocket="Lorem" />
      </Section>
    </Heading>
  );
}

export default withAuth(HomePage);
