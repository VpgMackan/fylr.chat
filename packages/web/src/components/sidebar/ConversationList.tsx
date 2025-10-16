import Conversation from './Conversation';

interface Item {
  id: string;
  name: string;
}

interface ItemListProps {
  items: Item[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function ConversationList({
  items = [],
  selectedId,
  onSelect,
  onRename,
  onDelete,
}: ItemListProps) {
  // Default no-op handlers if not provided
  const handleRename = onRename || (async () => {});
  const handleDelete = onDelete || (async () => {});

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Conversation
            key={item.id}
            id={item.id}
            name={item.name}
            selected={item.id === selectedId}
            onClick={() => onSelect?.(item.id)}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
