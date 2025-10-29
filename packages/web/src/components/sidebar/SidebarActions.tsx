import Button from '../ui/Button';

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
  return (
    <div className="space-y-2">
      <Button
        name="New Chat"
        icon="heroicons-solid:plus"
        onClick={onCreateChat}
        variant="primary"
      />
      <Button
        name="Create Content"
        icon="heroicons-solid:sparkles"
        onClick={onCreateContent}
        variant="secondary"
      />
    </div>
  );
}
