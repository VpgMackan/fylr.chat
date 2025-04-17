"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PodcastIdPage({
  params,
}: {
  params: Promise<{ id: string; podcastid: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [podcastId, setPodcastId] = useState<string | null>(null);
  const router = useRouter();

  const commonT = useTranslations("common");
  const podcastT = useTranslations("pages.podcast");

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setPodcastId(res.podcastid);
    });
  }, [params]);

  return (
    <div>
      <p>{id}</p>
      <p>{podcastId}</p>
    </div>
  );
}
