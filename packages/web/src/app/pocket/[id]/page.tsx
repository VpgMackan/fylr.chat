"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Source from "@/components/Source";
import PinnedPod from "@/components/Podcast";
import Chat from "@/components/Chat";

export default function PocketIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();

  const common = useTranslations("common");
  const t = useTranslations("PocketIdPage");

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
    });
  }, [params]);

  return (
    <div>
      <div className="flex text-5xl items-center">
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
        <p className="ml-8 font-bold">🧠 Lorem</p>
      </div>

      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">{t("yourSources")}</p>
          <div className="flex">
            <Button
              text={common("viewAll")}
              className="mr-2"
              onClick={() => router.push("/pocket")}
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
          <p className="font-semibold text-3xl">{t("mostRecent")}</p>
          <div className="flex">
            <Button
              text={common("viewAll")}
              className="mr-2"
              onClick={() => router.push("/pocket")}
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
          <p className="font-semibold text-3xl">{t("shortcuts")}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Button
            text={t("viewChats")}
            onClick={() => router.push("/pocket")}
          />
          <Button
            text={t("viewSummaries")}
            onClick={() => router.push("/pocket")}
          />
          <Button
            text={t("viewPodcats")}
            onClick={() => router.push("/pocket")}
          />
        </div>
      </div>
    </div>
  );
}
