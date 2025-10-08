import ChatInput from '@/components/ui/ChatInput';
import ChatBubble from '@/components/ui/ChatBubble';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';

export default function ConversationIdPageView() {
  return (
    <div className="w-full col-span-5 p-4 flex flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4">
        {[{ id: 'd', role: 'user', content: 'Hello', metadata: {} }].map(
          (m) => (
            <ChatBubble
              key={m.id}
              user={m.role === 'user'}
              text={m.content}
              metadata={m.metadata}
              onRegenerate={() => {}}
              onDelete={() => {}}
            />
          ),
        )}
        <div />
      </div>

      <ChatInput onSend={() => {}} />
    </div>
  );
}
