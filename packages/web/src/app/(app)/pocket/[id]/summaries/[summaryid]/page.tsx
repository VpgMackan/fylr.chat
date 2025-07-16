'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/common/Button';
import ContentLayout from '@/components/layout/ContentLayout';
import SummaryCard from '@/components/features/summaries/SummaryCard';
import MarkdownComponent from '@/components/MarkdownComponents';

import { useSubscription } from '@/hooks/useEvents';

export default function SummaryPage({
  params,
}: {
  params: Promise<{ id: string; summaryid: string }>;
}) {
  const t = useTranslations('pages.summaries');
  const [_id, setId] = useState<string | null>(null);
  const [summaryid, setSummaryid] = useState<string | null>(null);
  const [summaryContent, setSummaryContent] = useState('');

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setSummaryid(res.summaryid);
    });
  }, [params]);

  const routingKey = summaryid ? `summary.${summaryid}.status` : null;

  useSubscription(routingKey, (data: any) => {
    console.log('Received summary update:', data);
    if (data?.payload?.summary) {
      setSummaryContent((prev) => prev + data.payload.summary);
    }
    if (data?.payload?.message) {
      console.log('Status:', data.payload.message);
    }
  });

  return (
    <ContentLayout
      title="What is nine plus ten?"
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      trailingHeaderActions={<Button text={t('editButton')} />}
      sidebarContent={
        <>
          <p className="text-xl">{t('summaryEpisodes')}</p>
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            <SummaryCard
              fileName="What's ai's impact on the world?"
              fileType="pdf"
              selected={true}
            />
            <SummaryCard
              fileName="What's ai's impact on the world?"
              fileType="web"
            />
          </div>
        </>
      }
    >
      <MarkdownComponent text={summaryContent} />
    </ContentLayout>
  );
}
