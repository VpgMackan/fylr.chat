"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createConversation } from "@/services/api/chat.api";
import { getSourcesByPocketId } from "@/services/api/source.api";
import { SourceApiResponse } from "@fylr/types";

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
  const [sources, setSources] = useState<SourceApiResponse[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const t = useTranslations("modals.createConversation");
  const commonT = useTranslations("common");

  // Fetch sources when modal opens
  useEffect(() => {
    if (isOpen && pocketId) {
      const fetchSources = async () => {
        setIsLoadingSources(true);
        try {
          const fetchedSources = await getSourcesByPocketId(pocketId);
          setSources(fetchedSources);
        } catch (err) {
          console.error("Failed to fetch sources:", err);
        } finally {
          setIsLoadingSources(false);
        }
      };

      fetchSources();
    }
  }, [isOpen, pocketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await createConversation(pocketId, {
        title: name.trim(),
        metadata: {},
        sourceIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
      });
      setName("");
      setSelectedSourceIds([]);
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
    setSelectedSourceIds([]);
    onClose();
  };

  const handleSourceToggle = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleSelectAllSources = () => {
    if (selectedSourceIds.length === sources.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(sources.map((source) => source.id));
    }
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

          {/* Source Selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("sourcesLabel")}
              </label>
              {sources.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllSources}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={isLoading || isLoadingSources}
                >
                  {selectedSourceIds.length === sources.length
                    ? t("deselectAll")
                    : t("selectAll")}
                </button>
              )}
            </div>

            {isLoadingSources ? (
              <div className="text-sm text-gray-500 py-2">
                {t("loadingSources")}
              </div>
            ) : sources.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">{t("noSources")}</div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {sources.map((source) => (
                  <label
                    key={source.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.includes(source.id)}
                      onChange={() => handleSourceToggle(source.id)}
                      disabled={isLoading}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {source.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {source.type} • {(source.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedSourceIds.length > 0 && (
              <div className="text-xs text-gray-600 mt-1">
                {t("selectedCount", { count: selectedSourceIds.length })}
              </div>
            )}
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
