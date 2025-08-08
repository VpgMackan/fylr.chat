import React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function SummaryListItem({
  title,
  pocket,
  description,
  id,
  pocketId,
}: {
  title: string;
  pocket: string;
  description: string;
  id: string;
  pocketId: string;
}) {
  const common = useTranslations('');
  const router = useRouter();

  const handleClick = () => {
    router.push(`/pocket/${pocketId}/summaries/${id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
    >
      <div className="flex justify-between mb-4">
        <p className="font-semibold">{title}</p>
        <p className="font-semibold">
          {common('pockets.labels.pocketName', { pocketName: pocket })}
        </p>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
}
