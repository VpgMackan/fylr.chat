import RecentLibraryGrid from '@/components/library/RecentLibraryGrid';
import ChatInput from '@/components/ui/ChatInput';

export default function HomeView() {
  return (
    <div className="flex flex-col justify-center items-center">
      <RecentLibraryGrid />
      <div className="mt-3 w-full flex justify-center">
        <ChatInput className="w-full max-w-[25rem]" />
      </div>
    </div>
  );
}
