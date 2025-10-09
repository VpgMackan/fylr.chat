'use client';

import { useParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import SummaryIdPageView from '@/components/features/summary/SummaryIdView';

export default function SummaryIdPage() {
  const params = useParams();
  const selectedSummaryId = params.summaryid as string;

  return (
    <MainLayout sidebar={<Sidebar selectedId={selectedSummaryId} />}>
      <SummaryIdPageView />
    </MainLayout>
  );
}
