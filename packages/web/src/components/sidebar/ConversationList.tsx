import Conversation from './Conversation';

interface Conversation {
  id: string;
  name: string;
}

interface ConversationListProps {
  conversations?: Conversation[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function ConversationList({
  conversations = [{ id: '1', name: 'Hello' }],
  selectedId,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        {conversations.map((conv) => (
          <Conversation
            key={conv.id}
            name={conv.name}
            selected={conv.id === selectedId}
            onClick={() => onSelect?.(conv.id)}
          />
        ))}
      </div>
    </div>
  );
}
