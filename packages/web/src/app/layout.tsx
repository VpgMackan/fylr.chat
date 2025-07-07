import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import './globals.css';

import { Montserrat } from 'next/font/google';

const inter = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['700'],
});

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
  return (
    <html lang={locale} className={`${inter.variable}`}>
      <body className="p-16 font-montserrat bg-blue-50 text-gray-900 h-screen">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
