'use client';

import RecentLibraryGrid from '@/components/library/RecentLibraryGrid';
import ChatInput from '@/components/ui/ChatInput';

import toast from 'react-hot-toast';

import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useState } from 'react';

export default function HomeView() {
  const router = useRouter();
  const { initiateAndSendMessage } = useChat(null);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (payload: {
    content: string;
    sourceIds?: string[];
  }) => {
    if (isSending) return;
    setIsSending(true);

    const newConversation = await initiateAndSendMessage(payload);

    if (newConversation) {
      toast.success('New conversation started!');
      router.push(`/c/${newConversation.id}`);
    } else {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-full w-full px-4">
      <div className="flex-grow flex items-center justify-center">
        <RecentLibraryGrid />
      </div>
      <div className="w-full flex justify-center pb-8">
        <ChatInput onSend={handleSend} className="w-full max-w-[40rem]" />
      </div>
    </div>
  );
}
