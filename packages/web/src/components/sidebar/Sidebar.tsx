import { useState } from 'react';

import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import SidebarActions from './SidebarActions';
import ConversationList from './ConversationList';
import CreateLibraryModal from '../modals/CreateLibraryModal';

interface SidebarProps {
  conversations?: Array<{ id: string; name: string }>;
  selectedConversationId?: string;
  onConversationSelect?: (id: string) => void;
  onCreateContent?: () => void;
  onSelectLibrary?: () => void;
}

export default function Sidebar({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onCreateContent,
  onSelectLibrary,
}: SidebarProps) {
  const [createLibraryModalOpen, setCreateLibraryModalOpen] = useState(false);

  return (
    <>
      <CreateLibraryModal
        isOpen={createLibraryModalOpen}
        onClose={() => {
          setCreateLibraryModalOpen(false);
        }}
      />
      <div className="bg-blue-100 p-2 flex flex-col h-full">
        <SidebarActions
          onCreateContent={() => setCreateLibraryModalOpen(true)}
        />

        {/* Divider */}
        <hr className="my-2 text-gray-600" />

        <div className="mb-3">
          {/* Dropdown to show content */}
          <Dropdown
            options={['Conversations', 'Summaries', 'Podcasts']}
            defaultOption="Conversations"
          />
        </div>

        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={onConversationSelect}
        />

        <div className="mt-auto pt-2">
          {/** Settings button */}
          <Button name="Account" icon="heroicons:user-16-solid" />
        </div>
      </div>
    </>
  );
}
