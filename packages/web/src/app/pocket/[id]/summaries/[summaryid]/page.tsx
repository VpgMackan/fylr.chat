// packages/web/src/app/pocket/[id]/summaries/[summaryid]/page.tsx

'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/common/Button';
import ContentLayout from '@/components/layout/ContentLayout';
import SummaryCard from '@/components/features/summaries/SummaryCard';
import MarkdownComponent from '@/components/MarkdownComponents';

import { useEvents } from '@/hooks/useEvents';

// Note: Renamed the component to be more accurate (SummaryPage instead of ChatPage)
export default function SummaryPage({
  params,
}: {
  params: Promise<{ id: string; summaryid: string }>;
}) {
  const { isConnected, subscribe, unsubscribe } = useEvents();

  const t = useTranslations('pages.summaries');
  const [pocketId, setPocketId] = useState<string | null>(null); // Renamed for clarity
  const [summaryid, setSummaryid] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setPocketId(res.id);
      setSummaryid(res.summaryid);
    });
  }, [params]);

  useEffect(() => {
    if (!summaryid) return;

    const topic = `summary.${summaryid}.status`;
    const eventName = 'done';

    const handleSummaryUpdate = (payload: any) => {
      console.log('Received summary update:', payload);
      alert(`Summary Status: ${JSON.stringify(payload)}`);
    };

    console.log(`Subscribing to topic: ${topic} with event: ${eventName}`);
    subscribe(topic, eventName, handleSummaryUpdate);

    return () => {
      console.log(`Unsubscribing from topic: ${topic}`);
      unsubscribe(topic, eventName, handleSummaryUpdate);
    };
  }, [summaryid, subscribe, unsubscribe]);

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
      <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <MarkdownComponent text={``} />
    </ContentLayout>
  );
}
