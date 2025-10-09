'use client';

import { useParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import ConversationIdPageView from '@/components/features/c/ConversationIdView';

export default function ConversationIdPage() {
  const params = useParams();
  const selectedConversationId = params.conversationid as string;

  return (
    <MainLayout sidebar={<Sidebar selectedId={selectedConversationId} />}>
      <ConversationIdPageView />
    </MainLayout>
  );
}
