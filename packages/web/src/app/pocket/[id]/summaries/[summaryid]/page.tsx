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

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; summaryid: string }>;
}) {
  const {
    isConnected,
    subscribe,
    unsubscribe,
    addGlobalCallback,
    removeGlobalCallback,
  } = useEvents();

  const t = useTranslations('pages.summaries');
  const [id, setId] = useState<string | null>(null);
  const [summaryid, setSummaryid] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setSummaryid(res.summaryid);
    });
  }, [params]);

  useEffect(() => {
    const handleSummaryDone = (payload: any) => {
      alert(payload);
    };

    subscribe('summary.3FJuBAFGCIP3GxDzAAAB.status');
    addGlobalCallback(handleSummaryDone);

    return () => {
      unsubscribe('summary.3FJuBAFGCIP3GxDzAAAB.status');
      removeGlobalCallback(handleSummaryDone);
    };
  }, [subscribe, unsubscribe]);

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
      <MarkdownComponent text={``} />
    </ContentLayout>
  );
}
