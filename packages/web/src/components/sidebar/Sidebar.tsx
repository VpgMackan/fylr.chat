import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Conversation from '@/components/sidebar/Conversation';

export default function Sidebar() {
  return (
    <div className="bg-blue-100 p-2 flex flex-col h-full">
      <div className="flex flex-col gap-2">
        <div>
          {/* QUICK CREATE BUTTON (OPENS MODAL FOR Library CREATION AND CONTENT CREATION) */}
          <Button name="Create content" icon="heroicons-solid:plus-sm" />
        </div>
        <div>
          {/* Library selection menu. Select a Library to be used in a conversation*/}
          <Button name="Select library" icon="heroicons-solid:collection" />
        </div>
      </div>

      {/* Divider */}
      <hr className="my-2 text-gray-600" />

      <div className="mb-3">
        {/* Dropdown to show content */}
        <Dropdown
          options={['Conversations', 'Summaries', 'Podcasts']}
          defaultOption="Conversations"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          {/* Item list */}
          <Conversation name="Hello" selected={false} />
        </div>
      </div>

      <div className="mt-auto pt-2">
        {/** Settings button */}
        <Button name="Account" icon="heroicons:user-16-solid" />
      </div>
    </div>
  );
}
