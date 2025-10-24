'use client';

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
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-600">
            Welcome to Fylr Chat
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Ask anything and I will try to help you out!
          </p>
        </div>
        <div className="w-full">
          <ChatInput onSend={handleSend} className="w-full" />
        </div>
      </div>
    </div>
  );
}
