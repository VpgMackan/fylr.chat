'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import ConversationIdPageView from '@/components/features/c/ConversationIdView';
import { getConversations } from '@/services/api/chat.api';
import { ConversationApiResponse } from '@fylr/types';

export default function ConversationIdPage() {
  const [conversations, setConversations] = useState<ConversationApiResponse[]>(
    [],
  );
  const router = useRouter();
  const params = useParams();
  const selectedConversationId = params.conversationid as string;

  useEffect(() => {
    getConversations({ take: 50, offset: 0 })
      .then((data) => {
        setConversations(data);
      })
      .catch(console.error);
  }, []);
  const handleConversationSelect = (id: string) => {
    router.push(`/c/${id}`);
  };

  return (
    <MainLayout
      sidebar={
        <Sidebar
          conversations={conversations.map((c) => ({
            id: c.id,
            name: c.title,
          }))}
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
        />
      }
    >
      <ConversationIdPageView />
    </MainLayout>
  );
}
