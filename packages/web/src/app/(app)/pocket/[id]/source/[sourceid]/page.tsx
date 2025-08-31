'use client';

import { useEffect, useState } from 'react';

export default function SourcePage({
  params,
}: {
  params: Promise<{ sourceid: string }>;
}) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  useEffect(() => {
    params.then((res) => {
      setSourceId(res.sourceid);
    });
  }, [params]);

  return (
    <>
      {sourceId ? (
        <div className="flex h-full gap-x-2">
          <div className="flex-1">
            <iframe
              src={`${process.env.NEXT_PUBLIC_API_URL}/source/file/${sourceId}`}
              className="w-full h-full"
            />
          </div>
          <div className="flex-1">
            <p>Hello</p>
          </div>
        </div>
      ) : (
        <>
          <h1>Proccessing</h1>
        </>
      )}
    </>
  );
}
