import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export default function Chat({
  title,
  id,
  pocket,
}: {
  title: string;
  id: string;
  pocket?: string;
}) {
  const [visible, setVisible] = useState(false);
  const common = useTranslations('pockets');

  const router = useRouter();
  const pathname = usePathname();

  const handleClick = useCallback(() => {
    router.push(pathname + '/' + id);
  }, [router, pathname, id]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      className={`w-full bg-transparent text-left border border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-500 ease-in-out flex flex-col justify-between ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClick}
    >
      <div className="flex justify-between">
        <p className="font-semibold">{title}</p>
        {pocket === undefined ? (
          <></>
        ) : (
          <p className="font-semibold">
            {common('labels.pocketName', { pocketName: pocket })}
          </p>
        )}
      </div>
    </button>
  );
}
