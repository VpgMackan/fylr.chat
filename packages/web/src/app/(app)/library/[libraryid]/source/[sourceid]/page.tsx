'use client';

import { useParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import SourceIdPageView from '@/components/features/library/source/SourceIdView';

export default function LibraryIdPage() {
  const params = useParams();
  const selectedLibraryId = params.libraryid as string;
  const selectedSourceId = params.sourceid as string;

  return (
    <MainLayout sidebar={<Sidebar selectedId={selectedLibraryId} />}>
      <SourceIdPageView />
    </MainLayout>
  );
}
