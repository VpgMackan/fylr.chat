import Conversation from './Conversation';

interface Item {
  id: string;
  name: string;
}

interface ItemListProps {
  items: Item[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function ConversationList({
  items = [],
  selectedId,
  onSelect,
}: ItemListProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Conversation
            key={item.id}
            name={item.name}
            selected={item.id === selectedId}
            onClick={() => onSelect?.(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
