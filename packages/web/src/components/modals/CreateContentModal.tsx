import { useState, useRef } from 'react';

import Button from '../ui/Button';
import CreateLibraryContent, {
  CreateLibraryContentRef,
} from './CreateLibraryContent';

type ContentType = 'Library' | 'Summary' | 'Podcast';

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateSummaryContent() {
  return <p>Summary Content</p>;
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

  const renderContent = () => {
    switch (contentType) {
      case 'Library':
        return <CreateLibraryContent ref={libraryContentRef} />;
      case 'Summary':
        return <CreateSummaryContent />;
      case 'Podcast':
        return <CreatePodcastContent />;
    }
  };

  const handleCreate = async () => {
    if (contentType === 'Library' && libraryContentRef.current) {
      setIsCreating(true);
      try {
        await libraryContentRef.current.handleCreate();
        onClose();
      } catch (error) {
        console.error('Failed to create library:', error);
      } finally {
        setIsCreating(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-16">
      <div className="bg-blue-50 w-full h-full p-2 rounded-3xl flex gap-4">
        <div className="bg-blue-100 rounded-2xl p-4 w-1/4 h-full">
          <p>Content Type</p>
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
          <div className="bg-white rounded-2xl p-8 w-full h-full flex flex-col">
            <div className="flex-1">{renderContent()}</div>
            <div className="flex justify-end gap-4">
              <Button
                name="Close"
                variant="secondary"
                onClick={onClose}
                disabled={isCreating}
              />
              <Button
                name={isCreating ? 'Creating...' : 'Create'}
                onClick={handleCreate}
                disabled={
                  isCreating ||
                  (contentType === 'Library' &&
                    !libraryContentRef.current?.canCreate)
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
