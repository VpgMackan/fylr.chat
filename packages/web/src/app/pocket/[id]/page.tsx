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
import Heading from "@/components/layout/Heading";
import Section from "@/components/layout/Section";

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
    console.log("Saving pocket:", {
      pocketName,
      pocketDescription,
      pocketTags,
    });
  };

  return (
    <Heading
      title={pocketName}
      infrontTitle={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      rightSideContent={
        <Button
          text={t("pocketDetail.editPocket")}
          className="mr-2"
          onClick={() => setIsEditModalOpen(true)}
        />
      }
    >
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

      <Section
        title={sources("labels.yourSources")}
        actions={
          <Button
            text={common("buttons.viewAll")}
            className="mr-2"
            onClick={() => router.push("/pocket/" + id + "/sources")}
          />
        }
        cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
      >
        <Source
          title="🧠 Lorem"
          summery="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          size="2.4 KB"
          imported="2025/04/13"
          id="e57b8ddd-c118-43cf-a595-067579b62b97"
          pocketId={id || ""}
        />
      </Section>

      <Section
        title={t("pocketDetail.mostRecent")}
        cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
      >
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
      </Section>

      <Section title={t("pocketDetail.shortcuts")} cols="grid-cols-3">
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
      </Section>
    </Heading>
  );
}
