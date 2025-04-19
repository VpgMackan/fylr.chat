"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Heading from "@/components/layout/Heading";
import Button from "@/components/common/Button";
import ChatInput from "@/components/features/chat/ChatInput";

import Chat from "@/components/features/chat/Chat";

const mockmarkdown = `# Heading 1
## Heading 2
### Heading 3

This is a paragraph with **bold text**, *italic text*, and ~~strikethrough text~~.

You can also use [links](https://www.example.com) and inline code: \`console.log('Hello World!')\`

### Lists

* Unordered list item 1
* Unordered list item 2
* Unordered list item 3

1. Ordered list item 1
2. Ordered list item 2
3. Ordered list item 3

### Code Blocks

\`\`\`python
print("Hello World!")
\`\`\`

\`\`\`javascript
console.log('Hello World!');
\`\`\`

### Tables

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
|----------|----------|----------|
| Cell 4   | Cell 5   | Cell 6   |

### Blockquotes

> This is a blockquote. You can use it to quote text.

### Emojis

😊 👍 💻

### Task Lists

- [x] Task 1
- [ ] Task 2
- [ ] Task 3
`;

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatid: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setChatId(res.chatid);
    });
  }, [params]);

  return (
    <Heading
      title="What is nine plus ten?"
      infrontTitle={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      rightSideContent={<Button text="Edit" className="mr-2" />}
    >
      <div className="grid grid-cols-6 gap-4 h-full overflow-y-hidden pb-4 pt-8">
        <div className="bg-blue-100 rounded-2xl border-2 border-blue-300 p-4"></div>
        <div className="bg-blue-100 col-span-5 rounded-2xl border-2 border-blue-300 p-4 flex flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 flex-grow overflow-y-auto mb-4">
            <Chat
              user={true}
            >{`Hello, how are you doing today? Can you give me some mock markdown?`}</Chat>

            <Chat user={false}>{mockmarkdown}</Chat>
          </div>

          <ChatInput />
        </div>
      </div>
    </Heading>
  );
}
