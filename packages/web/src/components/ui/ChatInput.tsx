import { Icon } from '@iconify/react';

export default function ChatInput({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col bg-blue-200 rounded-2xl border border-blue-300 shadow-md">
        <textarea
          className="w-full bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none p-3 overflow-y-auto min-h-[44px] max-h-40"
          placeholder="Ask anything"
          rows={1}
        />

        <div className="flex items-center justify-between p-2 pt-0">
          <div className="flex gap-2">
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:plus" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:web" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:dots-horizontal" width="20" height="20" />
            </button>
          </div>

          <div className="flex gap-4">
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:microphone" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-500 rounded-full hover:bg-blue-700">
              <Icon icon="mdi:arrow-up" width="20" height="20" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
