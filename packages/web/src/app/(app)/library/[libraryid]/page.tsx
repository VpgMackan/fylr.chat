'use client';

import { useParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import LibraryIdPageView from '@/components/features/library/LibraryIdView';

export default function LibraryIdPage() {
  const params = useParams();
  const selectedLibraryId = params.libraryid as string;

  return (
    <MainLayout sidebar={<Sidebar selectedId={selectedLibraryId} />}>
      <LibraryIdPageView />
    </MainLayout>
  );
}
