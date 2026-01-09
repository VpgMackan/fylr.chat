import Button from '../ui/Button';

interface SidebarActionsProps {
  onCreateChat?: () => void;
  onCreateContent?: () => void;
  onManageMigrations?: () => void;
  onSelectLibrary?: () => void;
  onPendingSources?: () => void;
}

export default function SidebarActions({
  onCreateChat,
  onCreateContent,
  onManageMigrations,
  onPendingSources,
  onSelectLibrary,
}: SidebarActionsProps) {
  return (
    <div className="space-y-2">
      <Button
        name=""
        icon="heroicons-solid:plus"
        onClick={onCreateChat}
        variant="primary"
      />
      <Button
        name=""
        icon="heroicons-solid:sparkles"
        onClick={onCreateContent}
        variant="secondary"
      />
      <Button
        name=""
        icon="mdi:database-refresh"
        onClick={onManageMigrations}
        variant="secondary"
      />
      <Button
        name=""
        icon="mdi:clock-alert"
        onClick={onPendingSources}
        variant="secondary"
      />
    </div>
  );
}
