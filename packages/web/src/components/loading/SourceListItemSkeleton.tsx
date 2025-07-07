import React, { useEffect, useState } from 'react';

export default function SourceSkeleton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`border border-gray-600 rounded-lg p-4 flex flex-col justify-between animate-pulse transition-opacity duration-500 ease-in-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="space-y-2">
        <div className="h-5 bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-700 rounded w-full" />
      </div>

      <div>
        <hr className="border-gray-600 my-2" />
        <div className="h-3 bg-gray-700 rounded w-1/4 mb-1" />
        <div className="h-3 bg-gray-700 rounded w-1/3" />
      </div>
    </div>
  );
}
