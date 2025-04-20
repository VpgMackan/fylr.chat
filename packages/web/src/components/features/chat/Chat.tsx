import MarkdownComponent from "@/components/MarkdownComponents";
import React from "react";

export default function Chat({
  user,
  children,
}: {
  user: boolean;
  children: string;
}) {
  const maxWidthClass = user ? "max-w-[30%]" : "max-w-[70%]";
  const justifyContentClass = user ? "justify-end" : "justify-start";
  const bubbleStyle = user
    ? "bg-blue-200 border-blue-300"
    : "bg-gray-100 border-gray-300";

  return (
    <div
      className={`flex ${justifyContentClass}`}
      role="listitem"
      aria-label={user ? "User message" : "Assistant message"}
    >
      <div
        className={`border-2 p-4 rounded-4xl ${maxWidthClass} ${bubbleStyle}`}
      >
        <MarkdownComponent text={children} />
      </div>
    </div>
  );
}
