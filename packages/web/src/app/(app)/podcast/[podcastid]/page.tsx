'use client';

import { useParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import PodcastIdPageView from '@/components/features/podcast/PodcastIdView';

export default function PodcastIdPage() {
  const params = useParams();
  const selectedPodcastId = params.podcastid as string;

  return (
    <MainLayout sidebar={<Sidebar selectedId={selectedPodcastId} />}>
      <PodcastIdPageView />
    </MainLayout>
  );
}
