import React, { useEffect, useState } from 'react';

export default function PodcastListItemSkeleton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`border border-gray-600 rounded-lg p-4 hover:shadow-md flex flex-col justify-between animate-pulse transition-opacity duration-500 ease-in-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex justify-between mb-8">
        <div className="h-6 bg-gray-700 rounded w-1/2"></div>
        <div className="h-6 bg-gray-700 rounded w-1/3"></div>
      </div>
      <div className="h-10 bg-gray-700 rounded w-32"></div>
    </div>
  );
}
