'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, Key } from 'react';
import { useRouter } from 'next/navigation';
import ListPageLayout, {
  DropdownOption,
} from '@/components/layout/ListPageLayout';
import Summarie from '@/components/SummaryListItem';
import SummarySkeleton from '@/components/loading/SummaryListItemSkeleton';
import CreateSummaryModal from '@/components/modals/CreateSummaryModal';
import { SummaryApiResponse } from '@fylr/types';
import { getSummariesByPocketId } from '@/services/api/summary.api';

export default function SummariePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('pages.summariesList');
  const commonT = useTranslations('common');

  useEffect(() => {
    params.then((res) => setPocketId(res.id));
  }, [params]);

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t('mostRecent') },
    { value: 2, label: t('title') },
    { value: 3, label: t('created') },
  ];

  const handleSummaryCreated = (summaryId: string) => {
    if (pocketId) {
      router.push(`/pocket/${pocketId}/summaries/${summaryId}`);
    }
  };

  const dataLoader = pocketId
    ? (params: { take: number; offset: number; searchTerm: string }) =>
        getSummariesByPocketId(pocketId, params)
    : undefined;

  const renderItems = (items: SummaryApiResponse[]) =>
    items.map((summary) => (
      <Summarie
        key={summary.id}
        id={summary.id}
        pocketId={pocketId || ''}
        title={summary.title}
        pocket="Current Pocket"
        description={`Generated: ${summary.generated || 'N/A'}`}
      />
    ));

  return (
    <>
      <ListPageLayout
        title={t('yourSummaries', { pocketName: '...' })}
        onBack={() => router.back()}
        onCreate={() => setIsModalOpen(true)}
        createText={commonT('buttons.create')}
        searchLabel={t('searchLabel')}
        clearSearchLabel={t('clearSearchLabel')}
        dropdownOptions={dropdownOptions}
        dataLoader={dataLoader}
        skeleton={<SummarySkeleton />}
        renderItems={renderItems}
      />
      {pocketId && (
        <CreateSummaryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pocketId={pocketId}
          onSuccess={handleSummaryCreated}
        />
      )}
    </>
  );
}
