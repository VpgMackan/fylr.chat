"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ListPageLayout, {
  DropdownOption,
} from "@/components/layout/ListPageLayout";
import Chat from "@/components/Chat";
import ChatSkeleton from "@/components/loading/Chat";
import { getConversationsById } from "@/services/api/chat.api";

export default function ChatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("pages.chatsList");
  const commonT = useTranslations("common");

  useEffect(() => {
    params.then((res) => setId(res.id));
  }, [params]);

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t("mostRecent") },
    { value: 2, label: t("title") },
    { value: 3, label: t("created") },
  ];

  const renderItems = (pockets: any[]) =>
    pockets.map(({ id, title }) => <Chat key={id} title={title} id={id} />);

  const dataLoader = id
    ? ({ take, offset }: { take: number; offset: number }) =>
        getConversationsById(id, { take, offset })
    : undefined;

  return (
    <ListPageLayout
      title={t("yourChats", { pocketName: "Lorem" })}
      onBack={() => router.back()}
      onCreate={() => router.push("/pocket/new")}
      createText={commonT("buttons.create")}
      searchLabel={t("searchLabel")}
      clearSearchLabel={t("clearSearchLabel")}
      dropdownOptions={dropdownOptions}
      dataLoader={dataLoader}
      take={10}
      skeleton={<ChatSkeleton />}
      skeletonCount={6}
      renderItems={renderItems}
    />
  );
}
