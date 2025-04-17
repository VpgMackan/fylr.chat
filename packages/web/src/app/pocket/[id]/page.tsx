"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import Source from "@/components/Source";
import PinnedPod from "@/components/Podcast";
import Chat from "@/components/Chat";
import EditPocketDialog from "@/components/EditPocketDialog";

export default function PocketIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pocketName, setPocketName] = useState("🧠 Lorem");
  const [pocketDescription, setPocketDescription] = useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  );
  const [pocketTags, setPocketTags] = useState("brain, lorem, example");

  const router = useRouter();

  const common = useTranslations("common");
  const sources = useTranslations("sources");
  const t = useTranslations("pages");

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
    });
  }, [params]);

  const handleSavePocket = () => {
    // Mock save functionality
    console.log("Saving pocket:", {
      pocketName,
      pocketDescription,
      pocketTags,
    });
    // Here you would typically call an API to save the changes
  };

  return (
    <div>
      <div className="flex text-5xl items-center justify-between">
        <div className="flex">
          <Icon icon="weui:back-outlined" onClick={() => router.back()} />
          <p className="ml-8 font-bold">{pocketName}</p>
        </div>
        <Button
          text={t("pocketDetail.editPocket")}
          className="mr-2"
          onClick={() => setIsEditModalOpen(true)}
        />
      </div>

      <EditPocketDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        pocketName={pocketName}
        pocketDescription={pocketDescription}
        pocketTags={pocketTags}
        setPocketName={setPocketName}
        setPocketDescription={setPocketDescription}
        setPocketTags={setPocketTags}
        onSave={handleSavePocket}
      />

      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">
            {sources("labels.yourSources")}
          </p>
          <div className="flex">
            <Button
              text={common("buttons.viewAll")}
              className="mr-2"
              onClick={() => router.push("/pocket/" + id + "/sources")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Source
            title="🧠 Lorem"
            summery="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            size="2.4 KB"
            imported="2025/04/13"
            id="e57b8ddd-c118-43cf-a595-067579b62b97"
            pocketId={id || ""}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">
            {t("pocketDetail.mostRecent")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Source
            title="🧠 Lorem"
            summery="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            size="2.4 KB"
            imported="2025/04/13"
            id="e57b8ddd-c118-43cf-a595-067579b62b97"
            pocketId={id || ""}
          />
          <PinnedPod title="Lorem ipsum" pocket="Lorem" />
          <Chat
            title="Lorem ipsum"
            pocket="Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          />
          <Chat
            title="Lorem ipsum"
            pocket="Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">
            {t("pocketDetail.shortcuts")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Button
            text={t("pocketDetail.viewChats")}
            onClick={() => router.push("/pocket/" + id + "/chats")}
          />
          <Button
            text={t("pocketDetail.viewSummaries")}
            onClick={() => router.push("/pocket/" + id + "/summaries")}
          />
          <Button
            text={t("pocketDetail.viewPodcasts")}
            onClick={() => router.push("/pocket/" + id + "/podcasts")}
          />
        </div>
      </div>
    </div>
  );
}
