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
    <div className="flex flex-col gap-2">
      <Button
        name="New Chat"
        icon="heroicons-solid:plus-sm"
        onClick={onCreateChat}
      />
      {/* QUICK CREATE BUTTON (OPENS MODAL FOR Library CREATION AND CONTENT CREATION) */}
      <Button
        name="Create content"
        icon="heroicons-solid:plus-sm"
        onClick={onCreateContent}
      />
      {/* Library selection menu. Select a Library to be used in a conversation*/}
      <Button
        name="Select library"
        icon="heroicons-solid:collection"
        onClick={onSelectLibrary}
      />
    </div>
  );
}
