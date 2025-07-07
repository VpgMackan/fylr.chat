'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import ListPageLayout, {
  DropdownOption,
} from '@/components/layout/ListPageLayout';
import Chat from '@/components/ChatListItem';
import ChatSkeleton from '@/components/loading/ChatListItemSkeleton';
import CreateConversationModal from '@/components/modals/CreateConversationModal';
import { getConversationsByPocketId } from '@/services/api/chat.api';
import { ConversationApiResponse } from '@fylr/types';

export default function ChatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const t = useTranslations('pages.chatsList');
  const commonT = useTranslations('common');

  useEffect(() => {
    params.then((res) => setId(res.id));
  }, [params]);

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t('mostRecent') },
    { value: 2, label: t('title') },
    { value: 3, label: t('created') },
  ];

  const renderItems = (chats: ConversationApiResponse[]) =>
    chats.map(({ id, title }) => <Chat key={id} title={title} id={id} />);

  const dataLoader = id
    ? ({ take, offset }: { take: number; offset: number }) =>
        getConversationsByPocketId(id, { take, offset })
    : undefined;

  const handleConversationCreated = (conversationId: string) => {
    setRefreshKey((prev) => prev + 1);
    router.push(`/pocket/${id}/chats/${conversationId}`);
  };

  return (
    <>
      <ListPageLayout
        title={t('yourChats', { pocketName: 'Lorem' })}
        onBack={() => router.back()}
        onCreate={() => setIsModalOpen(true)}
        createText={commonT('buttons.create')}
        searchLabel={t('searchLabel')}
        clearSearchLabel={t('clearSearchLabel')}
        dropdownOptions={dropdownOptions}
        dataLoader={dataLoader}
        take={10}
        skeleton={<ChatSkeleton />}
        skeletonCount={6}
        renderItems={renderItems}
        key={refreshKey}
      />

      {id && (
        <CreateConversationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pocketId={id}
          onSuccess={handleConversationCreated}
        />
      )}
    </>
  );
}
