'use client';

import ChatInput from '@/components/ui/ChatInput';
import Sidebar from '@/components/sidebar/Sidebar';
import RecentLibrary from '@/components/library/RecentLibrary';

export default function HomePage() {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="w-full flex justify-center">
        <div className="flex flex-col justify-center items-center">
          <div className="flex gap-2">
            {/** Recently used Librarys */}
            <RecentLibrary name="Library 1" />
            <RecentLibrary name="Library 2" />
            <RecentLibrary name="Library 3" />
          </div>
          <div className="mt-3 w-full flex justify-center">
            {/** Input field */}
            <ChatInput className="w-full max-w-[25rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
