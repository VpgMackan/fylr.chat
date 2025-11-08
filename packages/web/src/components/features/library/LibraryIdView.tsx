'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import SourceListItem from './SourceListItem';
import { getSourcesByLibraryId } from '@/services/api/source.api';
import { getLibraryById } from '@/services/api/library.api';
import { SourceApiResponse } from '@fylr/types';

export default function LibraryIdPageView() {
  const params = useParams();
  const router = useRouter();
  const libraryId = params.libraryid as string;

  const [sources, setSources] = useState<SourceApiResponse[] | null>(null);
  const [libraryName, setLibraryName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const libraryData = await getLibraryById(libraryId);
        setLibraryName(libraryData.title);

        const sourcesData = await getSourcesByLibraryId(libraryId);
        setSources(sourcesData);
      } catch (err: unknown) {
        console.error('Error fetching library data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (libraryId) {
      fetchData();
    }
  }, [libraryId]);

  return (
    <div className="p-6 w-full">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="mr-4 hover:opacity-70 transition-opacity"
        >
          <Icon icon="weui:back-outlined" className="text-2xl" />
        </button>
        <h1 className="text-3xl font-bold">{libraryName || 'Library'}</h1>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">Your Sources</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="border border-gray-600 rounded-lg p-4 animate-pulse"
              >
                <div className="h-6 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source) => (
              <SourceListItem key={source.id} source={source} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Icon
              icon="mdi:file-document-outline"
              className="text-6xl mx-auto mb-4 opacity-50"
            />
            <p>No sources available in this library</p>
          </div>
        )}
      </div>
    </div>
  );
}
