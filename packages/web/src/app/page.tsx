"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

import { redirect } from "next/navigation";

import Button from "@/components/Button";
import Pocket from "@/components/Pocket";
import Chat from "@/components/Chat";
import PinnedPod from "@/components/Podcast";

export default function HomePage() {
  const common = useTranslations("common");
  const t = useTranslations("HomePage");

  return (
    <div>
      <div className="flex text-5xl ">
        <p className="mr-8 font-bold">{t("welcome", { name: "Markus" })}</p>
        <Icon icon="twemoji:waving-hand" flip="horizontal" />
      </div>

      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">{common("yourPockets")}</p>
          <div className="flex">
            <Button
              text={common("viewAll")}
              className="mr-2"
              onClick={() => redirect("/pocket")}
            />
            <Button text={common("createNew")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Pocket
            title="🧠 Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            sources={12}
            created="2025/04/13"
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
    </div>
  );
}
