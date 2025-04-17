"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import Pocket from "@/components/Pocket";
import Chat from "@/components/Chat";
import PinnedPod from "@/components/Podcast";
import Heading from "@/components/layout/Heading";

export default function HomePage() {
  const common = useTranslations("common.buttons");
  const yourPockets = useTranslations("pockets.labels");
  const t = useTranslations("pages.home");
  const router = useRouter();

  return (
    <Heading
      title={t("welcome", { name: "Markus" })}
      behindTitle={<Icon icon="twemoji:waving-hand" flip="horizontal" />}
    >
      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">{yourPockets("yourPockets")}</p>
          <div className="flex">
            <Button
              text={common("viewAll")}
              className="mr-2"
              onClick={() => router.push("/pocket")}
            />
            <Button
              text={common("create")}
              onClick={() => router.push("/pocket/new")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Pocket
            title="🧠 Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            sources={12}
            created="2025/04/13"
            id="e57b8ddd-c118-43cf-a595-067579b62b97"
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">{t("mostRecentChat")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Chat
            title="Lorem ipsum"
            pocket="Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">{t("pinnedPodcasts")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PinnedPod title="Lorem ipsum" pocket="Lorem" />
        </div>
      </div>
    </Heading>
  );
}
