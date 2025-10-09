'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import SidebarActions from './SidebarActions';
import ConversationList from './ConversationList';
import CreateContentModal from '../modals/CreateContentModal';
import { getConversations } from '@/services/api/chat.api';
import { getSummaries } from '@/services/api/summary.api';
import { getPodcasts } from '@/services/api/podcast.api';
import { getLibraries } from '@/services/api/library.api';

type ContentType =
  | 'Conversations'
  | 'Summaries'
  | 'Podcasts'
  | 'Libraries'
  | '';

interface SidebarProps {
  selectedId?: string;
}

export default function Sidebar({ selectedId }: SidebarProps) {
  const [firstLoad, setFirstLoad] = useState(true);
  const [createContentModalOpen, setCreateContentModalOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedType = localStorage.getItem('sidebarContentType') as ContentType;
    if (
      savedType &&
      ['Conversations', 'Summaries', 'Podcasts', 'Libraries'].includes(
        savedType,
      )
    ) {
      setContentType(savedType);
    } else {
      setContentType('Conversations');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);

    let fetchPromise;
    switch (contentType) {
      case 'Summaries':
        fetchPromise = getSummaries({ take: 50, offset: 0 });
        break;
      case 'Podcasts':
        fetchPromise = getPodcasts({ take: 50, offset: 0 });
        break;
      case 'Libraries':
        fetchPromise = getLibraries({ take: 50, offset: 0 });
        break;
      case 'Conversations':
      default:
        fetchPromise = getConversations({ take: 50, offset: 0 });
        break;
    }

    fetchPromise
      .then((data) => {
        setItems(data);
      })
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
      });

    if (!firstLoad) {
      localStorage.setItem('sidebarContentType', contentType);
    } else {
      setFirstLoad(false);
    }
  }, [contentType]);

  const handleSelect = (id: string) => {
    switch (contentType) {
      case 'Summaries':
        router.push(`/summary/${id}`);
        break;
      case 'Podcasts':
        router.push(`/podcast/${id}`);
        break;
      case 'Libraries':
        router.push(`/library/${id}`);
        break;
      case 'Conversations':
      default:
        router.push(`/c/${id}`);
        break;
    }
  };

  const onCreateChat = () => {
    router.push('/');
  };

  return (
    <>
      <CreateContentModal
        isOpen={createContentModalOpen}
        onClose={() => setCreateContentModalOpen(false)}
      />
      <div className="bg-blue-100 p-2 flex flex-col h-full w-64">
        <SidebarActions
          onCreateChat={onCreateChat}
          onCreateContent={() => setCreateContentModalOpen(true)}
        />
        <hr className="my-2 text-gray-600" />
        <div className="mb-3">
          <Dropdown
            options={['Conversations', 'Summaries', 'Podcasts', 'Libraries']}
            selectedOption={contentType}
            onSelect={(option) => setContentType(option as ContentType)}
          />
        </div>

        {/* 4. Conditionally render the correct list */}
        {isLoading ? (
          <p className="text-sm text-gray-600 text-center p-4">Loading...</p>
        ) : (
          <ConversationList
            items={items.map((item) => ({ id: item.id, name: item.title }))}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        )}

        <div className="mt-auto pt-2">
          <Button name="Account" icon="heroicons:user-16-solid" />
        </div>
      </div>
    </>
  );
}
