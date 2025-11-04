'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

import Button from '@/components/ui/Button';
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

const CONTENT_TYPES = [
  {
    type: 'Conversations' as ContentType,
    icon: 'heroicons-solid:chat-alt-2',
    label: 'Chats',
  },
  {
    type: 'Summaries' as ContentType,
    icon: 'heroicons-solid:book-open',
    label: 'Summaries',
  },
  {
    type: 'Podcasts' as ContentType,
    icon: 'heroicons-solid:microphone',
    label: 'Podcasts',
  },
  {
    type: 'Libraries' as ContentType,
    icon: 'heroicons-solid:library',
    label: 'Libraries',
  },
] as const;

export default function Sidebar({ selectedId }: SidebarProps) {
  const [createContentModalOpen, setCreateContentModalOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.title?.toLowerCase().includes(query));
  }, [items, searchQuery]);

  // Automatically detect content type from current route
  useEffect(() => {
    if (pathname.startsWith('/podcast/')) {
      setContentType('Podcasts');
    } else if (pathname.startsWith('/summary/')) {
      setContentType('Summaries');
    } else if (pathname.startsWith('/library/')) {
      setContentType('Libraries');
    } else if (pathname.startsWith('/c/') || pathname === '/') {
      setContentType('Conversations');
    } else {
      // Fallback to saved preference or default
      const savedType = localStorage.getItem(
        'sidebarContentType',
      ) as ContentType;
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
    }
  }, [pathname]);

  // Fetch items when content type changes
  useEffect(() => {
    if (!contentType) return;

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

    // Save preference to localStorage
    localStorage.setItem('sidebarContentType', contentType);
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

  const getEmptyMessage = () => {
    switch (contentType) {
      case 'Conversations':
        return 'No conversations yet. Start a new chat!';
      case 'Summaries':
        return 'No summaries yet. Create your first summary!';
      case 'Podcasts':
        return 'No podcasts yet. Create your first podcast!';
      case 'Libraries':
        return 'No libraries yet. Create your first library!';
      default:
        return 'No items found';
    }
  };

  return (
    <>
      <CreateContentModal
        isOpen={createContentModalOpen}
        onClose={() => setCreateContentModalOpen(false)}
      />
      <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-3 flex flex-col h-full w-64 shadow-lg">
        <SidebarActions
          onCreateChat={onCreateChat}
          onCreateContent={() => setCreateContentModalOpen(true)}
        />

        <hr className="border-blue-200 my-3" />

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {CONTENT_TYPES.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all ${
                contentType === type
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-blue-100 hover:text-blue-600'
              }`}
            >
              <Icon icon={icon} width="20" height="20" className="mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder={`Search ${contentType.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 pr-10 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder-gray-400"
              aria-label={`Search ${contentType.toLowerCase()}`}
            />
            <Icon
              icon="heroicons-solid:search"
              width="18"
              height="18"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <Icon icon="heroicons-solid:x" width="18" height="18" />
              </button>
            )}
          </div>
        </div>

        {/* List Container */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {isLoading ? (
            <div className="space-y-2 p-2 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-blue-200/50 rounded-lg"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white/60 rounded-full p-4 mb-4">
                <Icon
                  icon={
                    contentType === 'Conversations'
                      ? 'heroicons-solid:chat-alt-2'
                      : contentType === 'Summaries'
                        ? 'heroicons-solid:book-open'
                        : contentType === 'Libraries'
                          ? 'heroicons-solid:library'
                          : 'heroicons-solid:microphone'
                  }
                  width="32"
                  height="32"
                  className="text-blue-400"
                />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {searchQuery
                  ? `No results found for "${searchQuery}"`
                  : getEmptyMessage()}
              </p>
            </div>
          ) : (
            <ConversationList
              items={filteredItems.map((item) => ({
                id: item.id,
                name: item.title,
              }))}
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
        </div>

        {/* Account Button */}
        <div className="pt-3 border-t border-blue-200">
          <Button
            name="Account"
            icon="heroicons:user-16-solid"
            onClick={() => router.push('/profile')}
            variant="ghost"
          />
        </div>
      </div>
    </>
  );
}
