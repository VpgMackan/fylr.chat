import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Button from './common/Button';

export default function PodcastListItem({
  id,
  pocketId,
  title,
  pocket,
}: {
  id: string;
  pocketId: string;
  title: string;
  pocket: string;
}) {
  const common = useTranslations('');
  const router = useRouter();

  return (
    <div className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div className="flex justify-between mb-8">
        <p className="font-semibold">{title}</p>
        <p className="font-semibold">
          {common('pockets.labels.pocketName', { pocketName: pocket })}
        </p>
      </div>
      <Button
        text={common('podcasts.goToPodcast')}
        onClick={() => router.push(`/pocket/${pocketId}/podcasts/${id}`)}
      />
    </div>
  );
}
