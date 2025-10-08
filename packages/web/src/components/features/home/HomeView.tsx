import RecentLibraryGrid from '@/components/library/RecentLibraryGrid';
import ChatInput from '@/components/ui/ChatInput';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';

export default function HomeView() {
  const router = useRouter();
  const { sendMessage } = useChat(null);

  const handleSend = async (content: string) => {
    router.push('/c/temp');
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
