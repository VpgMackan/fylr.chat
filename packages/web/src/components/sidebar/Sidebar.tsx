'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import SidebarActions from './SidebarActions';
import ConversationList from './ConversationList';
import CreateContentModal from '../modals/CreateContentModal';
import {
  getConversations,
  updateConversation,
  deleteConversation,
} from '@/services/api/chat.api';
import {
  getSummaries,
  updateSummary,
  deleteSummary,
} from '@/services/api/summary.api';
import {
  getPodcasts,
  updatePodcast,
  deletePodcast,
} from '@/services/api/podcast.api';
import { getLibraries } from '@/services/api/library.api';
import toast from 'react-hot-toast';

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

  const handleRename = async (id: string, newName: string) => {
    try {
      let successMessage = '';

      switch (contentType) {
        case 'Conversations':
          await updateConversation(id, { title: newName });
          successMessage = 'Conversation renamed successfully';
          break;
        case 'Summaries':
          await updateSummary(id, { title: newName });
          successMessage = 'Summary renamed successfully';
          break;
        case 'Podcasts':
          await updatePodcast(id, { title: newName });
          successMessage = 'Podcast renamed successfully';
          break;
        default:
          return;
      }

      // Update the local state to reflect the change
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, title: newName } : item,
        ),
      );
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to rename ${contentType.toLowerCase()}:`, error);
      toast.error(`Failed to rename ${contentType.toLowerCase()}`);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      let successMessage = '';
      let redirectPath = '/';

      switch (contentType) {
        case 'Conversations':
          await deleteConversation(id);
          successMessage = 'Conversation deleted successfully';
          redirectPath = '/';
          break;
        case 'Summaries':
          await deleteSummary(id);
          successMessage = 'Summary deleted successfully';
          redirectPath = '/';
          break;
        case 'Podcasts':
          await deletePodcast(id);
          successMessage = 'Podcast deleted successfully';
          redirectPath = '/';
          break;
        default:
          return;
      }

      // Remove from local state
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
      toast.success(successMessage);

      // If we deleted the currently selected item, navigate to home
      if (selectedId === id) {
        router.push(redirectPath);
      }
    } catch (error) {
      console.error(`Failed to delete ${contentType.toLowerCase()}:`, error);
      toast.error(`Failed to delete ${contentType.toLowerCase()}`);
      throw error;
    }
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
            onRename={
              contentType === 'Conversations' ||
              contentType === 'Summaries' ||
              contentType === 'Podcasts'
                ? handleRename
                : undefined
            }
            onDelete={
              contentType === 'Conversations' ||
              contentType === 'Summaries' ||
              contentType === 'Podcasts'
                ? handleDelete
                : undefined
            }
          />
        )}

        <div className="mt-auto pt-2">
          <Button name="Account" icon="heroicons:user-16-solid" />
        </div>
      </div>
    </>
  );
}
