import React, { useEffect, useState } from 'react';

export default function PocketSkeleton() {
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
      <div>
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-full mb-1"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6 mb-2"></div>
      </div>

      <div>
        <hr className="border-gray-700" />
        <div className="h-3 bg-gray-700 rounded w-1/2 mt-2 mb-1"></div>
        <div className="h-3 bg-gray-700 rounded w-1/3"></div>
      </div>
    </div>
  );
}
