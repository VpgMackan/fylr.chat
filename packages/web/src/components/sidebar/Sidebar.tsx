'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

import Button from '@/components/ui/Button';
import SidebarActions from './SidebarActions';
import ConversationList from './ConversationList';
import CreateContentModal from '../modals/CreateContentModal';
import SettingsModal from '../modals/SettingsModal';
import MigrationModal from '../features/library/MigrationModal';
import { useUser } from '@/contexts/UserContext';
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
import {
  getLibraries,
  updateLibrary,
  deleteLibrary,
} from '@/services/api/library.api';
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
  const { userRole } = useUser();
  const [createContentModalOpen, setCreateContentModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [showMigrations, setShowMigrations] = useState(false);
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
        case 'Libraries':
          await updateLibrary(id, { title: newName });
          successMessage = 'Library renamed successfully';
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
        case 'Libraries':
          await deleteLibrary(id);
          successMessage = 'Library deleted successfully';
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
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
      <MigrationModal
        isOpen={showMigrations}
        onClose={() => setShowMigrations(false)}
      />
      <div className="flex flex-row w-96">
        {/* Narrow Navigation Sidebar */}
        <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-2 flex flex-col h-full shadow-lg w-20">
          <SidebarActions
            onCreateChat={onCreateChat}
            onCreateContent={() => setCreateContentModalOpen(true)}
            onManageMigrations={() => setShowMigrations(true)}
          />

          <hr className="border-gray-300 my-3" />

          {/* Navigation Tabs */}
          <div className="flex flex-col gap-3 mb-3">
            {CONTENT_TYPES.map(({ type, icon, label }) => (
              <div key={type} className="relative group">
                <button
                  onClick={() => setContentType(type)}
                  className={`relative w-full flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${
                    contentType === type
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-200 hover:text-gray-900 hover:scale-105 shadow-sm'
                  }`}
                  title={label}
                  aria-label={label}
                >
                  {/* Active indicator bar */}
                  {contentType === type && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                  )}
                  <Icon icon={icon} width="24" height="24" />
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transp1nt border-r-gray-900" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col justify-end">
            <div className="px-2 mb-3 pt-3 border-t border-gray-300">
              <div
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[11px] font-bold tracking-wide uppercase shadow-sm transition-all ${
                  userRole === 'PRO'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {userRole === 'PRO' ? <span>Pro</span> : <span>Free</span>}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative group">
                <Button
                  name=""
                  icon="heroicons:user-16-solid"
                  onClick={() => setSettingsModalOpen(true)}
                  variant="ghost"
                />
                {/* Subscription Badge */}
                {userRole === 'PRO' && (
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-white shadow-sm"
                    title="Pro Member"
                  />
                )}

                {/* Enhanced Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  <div className="font-semibold">
                    {userRole === 'PRO' ? '✨ Pro Account' : 'Free Account'}
                  </div>
                  {userRole === 'FREE' && (
                    <div className="text-gray-300 text-[10px] mt-0.5">
                      Click to upgrade
                    </div>
                  )}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Main Content Area */}
        <div className="bg-gray-50 flex-1 overflow-hidden flex flex-col min-h-0 p-3 border-l border-gray-200">
          {/* Search Bar */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder={`Search ${contentType.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 pr-10 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500 shadow-sm hover:bg-gray-50"
              aria-label={`Search ${contentType.toLowerCase()}`}
            />
            <Icon
              icon="heroicons-solid:search"
              width="18"
              height="18"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                aria-label="Clear search"
              >
                <Icon icon="heroicons-solid:x" width="18" height="18" />
              </button>
            )}
          </div>

          {/* List Container */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {isLoading ? (
              <div className="space-y-2 p-2 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-200 rounded-lg"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white rounded-full p-4 mb-4 shadow-lg border border-gray-200">
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
                    className="text-gray-500"
                  />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed font-medium">
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
                  contentType === 'Podcasts' ||
                  contentType === 'Libraries'
                    ? handleRename
                    : undefined
                }
                onDelete={
                  contentType === 'Conversations' ||
                  contentType === 'Summaries' ||
                  contentType === 'Podcasts' ||
                  contentType === 'Libraries'
                    ? handleDelete
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
