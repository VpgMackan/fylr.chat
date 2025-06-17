"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createConversation } from "@/services/api/chat.api";

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pocketId: string;
  onSuccess?: (conversationId: string) => void;
}

export default function CreateConversationModal({
  isOpen,
  onClose,
  pocketId,
  onSuccess,
}: CreateConversationModalProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("modals.createConversation");
  const commonT = useTranslations("common");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await createConversation(pocketId, {
        title: name.trim(),
        metadata: {},
      });
      setName("");
      onClose();
      onSuccess?.(response.id);
    } catch (err) {
      setError(t("error"));
      console.error("Failed to create conversation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">{t("title")}</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="conversationName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("nameLabel")}
            </label>
            <input
              id="conversationName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={isLoading}
            >
              {commonT("buttons.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? t("creating") : commonT("buttons.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
