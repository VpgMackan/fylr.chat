"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";

import PodcastEpisodes from "@/components/features/podcasts/PodcastEpisodes";

import ContentLayout from "@/components/layout/ContentLayout";

export default function PodcastIdPage({
  params,
}: {
  params: Promise<{ id: string; podcastid: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [podcastId, setPodcastId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(600);

  const router = useRouter();

  const commonT = useTranslations("common");
  const podcastT = useTranslations("pages.podcast");

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setPodcastId(res.podcastid);
    });
  }, [params]);

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(event.target.value);
    setCurrentTime(newTime);
  };
  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  }

  return (
    <ContentLayout
      title="What is nine plus ten?"
      infrontTitle={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      rightSideContent={<Button text="Edit" />}
      sidebarContent={
        <>
          <p className="text-xl">Podcast Episodes</p>
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            <PodcastEpisodes
              fileName="What's ai's impact on the world?"
              fileType="pdf"
              selected={true}
            />
            <PodcastEpisodes
              fileName="What's ai's impact on the world?"
              fileType="web"
            />
          </div>
        </>
      }
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex text-2xl items-center justify-between">
          <p className="font-bold">1. Episode one</p>
          <div className="flex">
            <Button text="Share" className="mr-2" />
            <Button text="Download" className="mr-2" />
            <Button
              text={<Icon icon="ph:gear-fill" width="20" height="20" />}
            />
          </div>
        </div>

        <div className="flex gap-4 justify-center items-center">
          <div className="bg-blue-200 border-2 border-blue-300 rounded-full p-4">
            <Icon icon="fluent:skip-back-15-20-filled" width="24" height="24" />
          </div>

          <div className="bg-blue-200 border-2 border-blue-300 rounded-full p-4">
            <Icon icon="fluent:rewind-28-filled" width="32" height="32" />
          </div>

          <div className="bg-blue-200 border-2 border-blue-300 rounded-full p-4">
            {playing ? (
              <Icon icon="fluent:pause-28-filled" width="52" height="52" />
            ) : (
              <Icon icon="fluent:play-28-filled" width="52" height="52" />
            )}
          </div>
          <div className="bg-blue-200 border-2 border-blue-300 rounded-full p-4">
            <Icon icon="fluent:fast-forward-28-filled" width="32" height="32" />
          </div>
          <div className="bg-blue-200 border-2 border-blue-300 rounded-full p-4">
            <Icon
              icon="fluent:skip-forward-15-20-filled"
              width="24"
              height="24"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-col">
          <div className="flex justify-between w-full">
            <span className="text-s text-left">{formatTime(currentTime)}</span>

            <span className="text-s text-right">{formatTime(duration)}</span>
          </div>

          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
      </div>
    </ContentLayout>
  );
}
