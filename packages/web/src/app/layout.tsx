import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'react-hot-toast';
import CursorFollower from '@/components/CursorFollower';
import { PostHogProvider } from '@/components/PostHogProvider';
import { TrackingConsentBanner } from '@/components/TrackingConsentBanner';

export const metadata: Metadata = {
  title: 'Flyr.Chat',
  description: 'The ai chatbot for your files',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-blue-50 text-gray-900 h-screen">
        <PostHogProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Toaster position="top-right" reverseOrder={false} />
            {children}
            <TrackingConsentBanner />
          </NextIntlClientProvider>
        </PostHogProvider>

        <CursorFollower />
      </body>
    </html>
  );
}
