'use client';

import MarkdownComponent from '@/components/MarkdownComponents';
import { useEffect, useState } from 'react';

interface Vector {
  id: string;
  content: string;
  chunkIndex: number;
}

export default function SourcePage({
  params,
}: {
  params: Promise<{ sourceid: string }>;
}) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [vectors, setVectors] = useState<Vector[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then((res) => {
      setSourceId(res.sourceid);
    });
  }, [params]);

  useEffect(() => {
    if (sourceId) {
      setLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}source/${sourceId}/vectors`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          setVectors(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching vectors:', err);
          setLoading(false);
        });
    }
  }, [sourceId]);

  return (
    <>
      {sourceId ? (
        <div className="flex h-full gap-x-2">
          <div className="flex-1">
            <iframe
              src={`${process.env.NEXT_PUBLIC_API_URL}source/file/${sourceId}`}
              className="w-full h-full"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <p>Loading extracted content...</p>
            ) : (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Extracted Vectors
                </h2>
                {vectors.length > 0 ? (
                  vectors.map((vector) => (
                    <div key={vector.id} className="mb-4 p-2 border rounded">
                      <p className="text-sm text-gray-600">
                        Chunk {vector.chunkIndex}
                      </p>
                      <MarkdownComponent text={vector.content} />
                    </div>
                  ))
                ) : (
                  <p>No extracted content available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <h1>Processing</h1>
        </>
      )}
    </>
  );
}
