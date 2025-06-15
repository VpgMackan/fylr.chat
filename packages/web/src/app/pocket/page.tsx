"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import ListPageLayout, {
  DropdownOption,
} from "@/components/layout/ListPageLayout";
import Pocket from "@/components/PocketListItem";
import PocketSkeleton from "@/components/loading/PocketListItemSkeleton";
import { PocketApiResponse } from "@fylr/types";
import { getPockets } from "@/services/api/pocket.api";

export default function PocketPage() {
  const router = useRouter();
  const t = useTranslations("pages.pocketList");
  const commonT = useTranslations("common");

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t("mostRecent") },
    { value: 2, label: t("title") },
    { value: 3, label: t("created") },
  ];

  const renderItems = (pockets: PocketApiResponse[]) =>
    pockets.map(({ id, title, icon, description, source, createdAt }) => (
      <Pocket
        key={id}
        id={id}
        title={title}
        icon={icon}
        description={description}
        sources={source.length}
        created={createdAt}
      />
    ));

  const dataLoader = ({
    take,
    offset,
  }: {
    take: number;
    offset: number;
  }): Promise<PocketApiResponse[]> => {
    return getPockets({ take, offset });
  };

  return (
    <ListPageLayout
      title={t("yourPockets")}
      onBack={() => router.back()}
      onCreate={() => router.push("/pocket/new")}
      createText={commonT("buttons.create")}
      searchLabel={t("searchLabel")}
      clearSearchLabel={t("clearSearchLabel")}
      dropdownOptions={dropdownOptions}
      dataLoader={dataLoader}
      take={10}
      skeleton={<PocketSkeleton />}
      skeletonCount={6}
      renderItems={renderItems}
    />
  );
}
