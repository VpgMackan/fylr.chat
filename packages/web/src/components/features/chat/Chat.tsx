import MarkdownComponent from "@/components/MarkdownComponents";
import { useTranslations } from "next-intl";
import React from "react";

export default function Chat({ user, text }: { user: boolean; text: string }) {
  const t = useTranslations("features.chat");
  const maxWidthClass = user ? "max-w-[30%]" : "max-w-[70%]";
  const justifyContentClass = user ? "justify-end" : "justify-start";
  const bubbleStyle = user
    ? "bg-blue-200 border-blue-300"
    : "bg-gray-100 border-gray-300";

  return (
    <div
      className={`flex ${justifyContentClass}`}
      role="listitem"
      aria-label={user ? t("userMessage") : t("assistantMessage")}
    >
      <div
        className={`border-2 p-4 rounded-4xl ${maxWidthClass} ${bubbleStyle}`}
      >
        <MarkdownComponent text={text} />
      </div>
    </div>
  );
}
