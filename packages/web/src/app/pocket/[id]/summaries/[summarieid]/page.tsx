"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; summarieid: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [summarieId, setSummarieId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setSummarieId(res.summarieid);
    });
  }, [params]);

  return <div></div>;
}
