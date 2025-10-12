import { useState, useRef } from 'react';

import Button from '../ui/Button';
import CreateLibraryContent, {
  CreateLibraryContentRef,
} from './CreateLibraryContent';
import CreateSummaryContent, {
  CreateSummaryContentRef,
} from './CreateSummaryContent';

type ContentType = 'Library' | 'Summary' | 'Podcast';

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreatePodcastContent() {
  return <p>Podcast Content</p>;
}

const CONTENT_TYPES: ContentType[] = ['Library', 'Summary', 'Podcast'];

export default function CreateContentModal({
  isOpen,
  onClose,
}: CreateContentModalProps) {
  const [contentType, setContentType] = useState<ContentType>('Library');
  const [isCreating, setIsCreating] = useState(false);
  const libraryContentRef = useRef<CreateLibraryContentRef>(null);
  const summaryContentRef = useRef<CreateSummaryContentRef>(null);

  const renderContent = () => {
    switch (contentType) {
      case 'Library':
        return <CreateLibraryContent ref={libraryContentRef} />;
      case 'Summary':
        return <CreateSummaryContent ref={summaryContentRef} />;
      case 'Podcast':
        return <CreatePodcastContent />;
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      if (contentType === 'Library' && libraryContentRef.current) {
        await libraryContentRef.current.handleCreate();
        onClose();
      } else if (contentType === 'Summary' && summaryContentRef.current) {
        await summaryContentRef.current.handleCreate();
        onClose();
      }
    } catch (error) {
      console.error(`Failed to create ${contentType.toLowerCase()}:`, error);
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = () => {
    if (contentType === 'Library' && libraryContentRef.current) {
      return libraryContentRef.current.canCreate;
    } else if (contentType === 'Summary' && summaryContentRef.current) {
      return summaryContentRef.current.canCreate;
    }
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-16">
      <div className="bg-blue-50 w-full h-full p-2 rounded-3xl flex gap-4">
        <div className="bg-blue-100 rounded-2xl p-4 w-1/4 h-full">
          <p className="font-medium text-gray-700">Content Type</p>
          <div className="flex flex-col gap-2 mt-4">
            {CONTENT_TYPES.map((type) => (
              <Button
                key={type}
                variant={contentType === type ? 'primary' : 'secondary'}
                disabled={contentType === type}
                name={type}
                onClick={() => setContentType(type)}
              />
            ))}
          </div>
        </div>
        <div className="w-full flex justify-center">
          <div className="bg-white rounded-2xl p-6 w-full h-full flex flex-col">
            <div className="flex-1 overflow-hidden">{renderContent()}</div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
              <Button
                name="Close"
                variant="secondary"
                onClick={onClose}
                disabled={isCreating}
              />
              <Button
                name={isCreating ? 'Creating...' : 'Create'}
                onClick={handleCreate}
                disabled={isCreating || !canCreate()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
