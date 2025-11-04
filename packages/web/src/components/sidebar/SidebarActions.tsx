import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '../ui/Button';
import axios from '@/utils/axios';

interface SidebarActionsProps {
  onCreateChat?: () => void;
  onCreateContent?: () => void;
  onSelectLibrary?: () => void;
}

export default function SidebarActions({
  onCreateChat,
  onCreateContent,
  onSelectLibrary,
}: SidebarActionsProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await axios.get('/source/pending-ingestion');
        setPendingCount(response.data.length);
      } catch (err) {
        console.error('Failed to fetch pending sources count:', err);
      }
    };

    fetchPendingCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      <Button
        name=""
        icon="heroicons-solid:plus"
        onClick={onCreateChat}
        variant="primary"
      />
      <Button
        name=""
        icon="heroicons-solid:sparkles"
        onClick={onCreateContent}
        variant="secondary"
      />
      {pendingCount > 0 && (
        <div className="relative">
          <button
            onClick={() => router.push('/pending-sources')}
            className="w-full p-2 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-800 transition-all shadow-sm hover:shadow-md relative"
            title="Pending Sources"
          >
            <Icon icon="mdi:clock-alert" width="24" height="24" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
