'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import ConversationIdPageView from '@/components/features/c/ConversationIdView';

export default function ConversationIdPage() {
  return (
    <MainLayout sidebar={<Sidebar />}>
      <ConversationIdPageView />
    </MainLayout>
  );
}
