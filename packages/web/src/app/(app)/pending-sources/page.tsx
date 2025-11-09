'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import PendingSourcesView from '@/components/features/library/PendingSourcesView';

export default function PendingSourcesPage() {
  return (
    <MainLayout sidebar={<Sidebar />}>
      <PendingSourcesView />
    </MainLayout>
  );
}
