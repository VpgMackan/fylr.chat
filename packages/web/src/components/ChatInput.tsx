"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { Icon } from "@iconify/react";

export default function ChatInput() {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = ta.scrollHeight + "px";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="flex items-end gap-2 p-2 bg-blue-200 rounded-2xl">
      <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
        <Icon icon="mdi:plus" width="20" height="20" />
      </button>
      <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
        <Icon icon="mdi:web" width="20" height="20" />
      </button>
      <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
        <Icon icon="mdi:lightbulb-on-outline" width="20" height="20" />
      </button>
      <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
        <Icon icon="mdi:dots-horizontal" width="20" height="20" />
      </button>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder="Ask anything"
        className="flex-grow bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none p-2 overflow-y-auto max-h-40"
      />

      <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
        <Icon icon="mdi:microphone" width="20" height="20" />
      </button>
      <button className="p-2 bg-blue-500 rounded-full hover:bg-blue-700">
        <Icon icon="mdi:arrow-up" width="20" height="20" />
      </button>
    </div>
  );
}
