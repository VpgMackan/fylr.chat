"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import axios from "@/utils/axios";

interface SourceFile {
  file: File;
  id: string;
}

export default function NewPocketPage() {
  const t = useTranslations("pages.newPocket");
  const pocketT = useTranslations("pockets");
  const common = useTranslations("common");
  const sourcesT = useTranslations("sources");
  const router = useRouter();

  const [pocketName, setPocketName] = useState("");
  const [pocketDescription, setPocketDescription] = useState("");
  const [pocketTags, setPocketTags] = useState("");
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
      }));
      setSourceFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setSourceFiles((prev) => prev.filter((source) => source.id !== id));
  };

  const handleSourceButtonClick = () => {
    fileInputRef.current?.click();
  };

  const createPocket = async (pocketData: {
    title: string;
    description?: string;
    tags?: string[];
    icon?: string;
  }) => {
    const response = await axios.post("/pocket", pocketData);
    return response.data;
  };

  const uploadSource = async (pocketId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pocketId", pocketId);

    const response = await axios.post("/source", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      // Prepare pocket data
      const pocketData = {
        title: pocketName, // Changed from 'name' to 'title'
        description: pocketDescription || undefined,
        icon: "mdi:folder", // Added required icon field
        tags: pocketTags
          ? pocketTags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [], // Changed from undefined to empty array
      };

      // Create pocket
      const pocket = await createPocket(pocketData);

      // Upload sources if any
      if (sourceFiles.length > 0) {
        const uploadPromises = sourceFiles.map((source) =>
          uploadSource(pocket.id, source.file)
        );

        await Promise.all(uploadPromises);
      }

      // Redirect to the created pocket
      router.push(`/pocket/${pocket.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while creating the pocket"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // ...existing code...

  return (
    <div className="p-32">
      <div className="flex justify-between items-center mb-8">
        <div className="flex text-5xl items-center">
          <Icon
            icon="weui:back-outlined"
            onClick={() => router.back()}
            className="cursor-pointer hover:text-gray-700"
          />
          <p className="ml-8 font-bold">{t("title")}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-4">
          <div className="grow">
            <label
              htmlFor="pocketName"
              className="block text-lg font-medium text-gray-700 mb-1"
            >
              {pocketT("labels.nameField")}
            </label>
            <input
              id="pocketName"
              name="pocketName"
              type="text"
              value={pocketName}
              onChange={(e) => setPocketName(e.target.value)}
              placeholder={pocketT("placeholders.nameField")}
              required
              disabled={isCreating}
              className="border border-gray-300 rounded-lg py-2 px-4 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full disabled:bg-gray-100"
            />
          </div>
          <div>
            <label
              htmlFor="sourceButton"
              className="block text-lg font-medium text-gray-700 mb-1"
            >
              {sourcesT("labels.sourcesField")}
            </label>
            <Button
              id="sourceButton"
              type="button"
              text={sourcesT("placeholders.sourcesField")}
              onClick={handleSourceButtonClick}
              disabled={isCreating}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              onChange={handleFileSelection}
              className="hidden"
            />
          </div>
        </div>

        {/* Display selected files */}
        {sourceFiles.length > 0 && (
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Selected Sources ({sourceFiles.length})
            </label>
            <div className="space-y-2">
              {sourceFiles.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                >
                  <div className="flex items-center">
                    <Icon
                      icon="mdi:file-document"
                      className="text-blue-500 mr-2"
                    />
                    <span className="text-sm">{source.file.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(source.file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(source.id)}
                    disabled={isCreating}
                    className="text-red-500 hover:text-red-700 disabled:text-gray-400"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="pocketDescription"
            className="block text-lg font-medium text-gray-700 mb-1"
          >
            {pocketT("labels.descriptionField")}
          </label>
          <textarea
            id="pocketDescription"
            name="pocketDescription"
            rows={3}
            value={pocketDescription}
            onChange={(e) => setPocketDescription(e.target.value)}
            placeholder={pocketT("placeholders.descriptionField")}
            disabled={isCreating}
            className="border border-gray-300 rounded-lg py-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label
            htmlFor="pocketTags"
            className="block text-lg font-medium text-gray-700 mb-1"
          >
            {pocketT("labels.tagsField")}
          </label>
          <input
            id="pocketTags"
            name="pocketTags"
            type="text"
            value={pocketTags}
            onChange={(e) => setPocketTags(e.target.value)}
            placeholder={pocketT("placeholders.tagsField")}
            disabled={isCreating}
            className="border border-gray-300 rounded-lg py-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full disabled:bg-gray-100"
          />
          <p className="text-sm text-gray-500 mt-1">{pocketT("hints.tags")}</p>
        </div>

        <hr />

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            text={isCreating ? "Creating..." : common("buttons.create")}
            disabled={isCreating || !pocketName.trim()}
          />
          <Button
            type="button"
            text={common("buttons.cancel")}
            onClick={handleCancel}
            disabled={isCreating}
          />
        </div>
      </form>
    </div>
  );
}
