'use client';

import { ReactNode } from 'react';
import { EventsProvider } from '@/hooks/useEvents';
import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

export default function Providers({
  children,
  locale,
  messages,
}: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <EventsProvider>{children}</EventsProvider>
    </NextIntlClientProvider>
  );
}
