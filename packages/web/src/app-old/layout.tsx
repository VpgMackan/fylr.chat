import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { Montserrat } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'react-hot-toast';

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
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable}`}>
      <body className="p-16 font-montserrat bg-blue-50 text-gray-900 h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Toaster position='top-right' reverseOrder={false} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
