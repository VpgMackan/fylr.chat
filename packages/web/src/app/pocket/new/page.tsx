"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";

export default function NewPocketPage() {
  const t = useTranslations("NewPocketPage");
  const common = useTranslations("common");
  const router = useRouter();

  const [pocketName, setPocketName] = useState("");
  const [sources, setSources] = useState("");
  const [pocketDescription, setPocketDescription] = useState("");
  const [pocketTags, setPocketTags] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Creating pocket:", { pocketName, sources });
  };

  return (
    <div className="p-32">
      <div className="flex justify-between items-center mb-8">
        <div className="flex text-5xl items-center">
          <Icon
            icon="weui:back-outlined"
            onClick={() => router.back()}
            className="cursor-pointer hover:text-gray-700"
          />
          <p className="ml-8 font-bold">{t("createPocket")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-4">
          <div className="grow">
            <label
              htmlFor="pocketName"
              className="block text-lg font-medium text-gray-700 mb-1"
            >
              {t("pocketNameLabel")}
            </label>
            <input
              id="pocketName"
              name="pocketName"
              type="text"
              value={pocketName}
              onChange={(e) => setPocketName(e.target.value)}
              placeholder={t("pocketNamePlaceholder")}
              required
              className="border border-gray-300 rounded-lg py-2 px-4 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full" // Removed hover:bg-gray-100 for standard input feel
            />
          </div>
          <div>
            <label
              htmlFor="sourceButton"
              className="block text-lg font-medium text-gray-700 mb-1"
            >
              {t("sourcesLabel")}
            </label>
            <Button
              id="sourceButton"
              type="button"
              text={t("sourcesPlaceholder")}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="pocketDescription"
            className="block text-lg font-medium text-gray-700 mb-1"
          >
            {t("pocketDescriptionLabel")}
          </label>
          <textarea
            id="pocketDescription"
            name="pocketDescription"
            rows={3}
            value={pocketDescription}
            onChange={(e) => setPocketDescription(e.target.value)}
            placeholder={t("pocketDescriptionPlaceholder")}
            className="border border-gray-300 rounded-lg py-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
        <div>
          <label
            htmlFor="pocketTags"
            className="block text-lg font-medium text-gray-700 mb-1"
          >
            {t("pocketTagsLabel")}
          </label>
          <input
            id="pocketTags"
            name="pocketTags"
            type="text"
            value={pocketTags}
            onChange={(e) => setPocketTags(e.target.value)}
            placeholder={t("pocketTagsPlaceholder")}
            className="border border-gray-300 rounded-lg py-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
          <p className="text-sm text-gray-500 mt-1">{t("pocketTagsHint")}</p>
        </div>

        <hr />

        <div className="flex justify-end gap-4">
          <Button type="submit" text={t("cancelButton")} />
          <Button type="submit" text={t("createPocketButton")} />
        </div>
      </form>
    </div>
  );
}
