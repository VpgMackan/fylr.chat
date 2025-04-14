"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

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
      <p>{id}</p>
    </div>
  );
}
