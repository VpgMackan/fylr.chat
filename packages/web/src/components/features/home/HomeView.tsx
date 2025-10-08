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

  const handleSend = async (content: string) => {
    if (isSending) return;
    setIsSending(true);

    const newConversation = await initiateAndSendMessage(content);

    if (newConversation) {
      toast.success('New conversation started!');
      router.push(`/c/${newConversation.id}`);
    } else {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <RecentLibraryGrid />
      <div className="mt-3 w-full flex justify-center">
        <ChatInput onSend={handleSend} className="w-full max-w-[25rem]" />
      </div>
    </div>
  );
}
