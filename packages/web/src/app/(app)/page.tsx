'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import HomeView from '@/components/features/home/HomeView';
import { getConversations } from '@/services/api/chat.api';
import { ConversationApiResponse } from '@fylr/types';

export default function HomePage() {
  const [conversations, setConversations] = useState<ConversationApiResponse[]>(
    [],
  );
  const router = useRouter();
  const params = useParams();

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
          onConversationSelect={handleConversationSelect}
        />
      }
    >
      <HomeView />
    </MainLayout>
  );
}
