"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import ListPageLayout, {
  DropdownOption,
} from "@/components/layout/ListPageLayout";
import Pocket from "@/components/Pocket";

export default function PocketPage() {
  const router = useRouter();
  const t = useTranslations("pages.pocketList");
  const commonT = useTranslations("common");

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t("mostRecent") },
    { value: 2, label: t("title") },
    { value: 3, label: t("created") },
  ];

  return (
    <ListPageLayout
      title={t("yourPockets")}
      onBack={() => router.back()}
      onCreate={() => router.push("/pocket/new")}
      createText={commonT("buttons.create")}
      searchLabel={t("searchLabel")}
      clearSearchLabel={t("clearSearchLabel")}
      dropdownOptions={dropdownOptions}
      gridClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
    >
      <Pocket
        title={"title"}
        icon={"icon"}
        description={"description"}
        sources={"source".length}
        created={"createdAt"}
        id={"id"}
      />
    </ListPageLayout>
  );
}
