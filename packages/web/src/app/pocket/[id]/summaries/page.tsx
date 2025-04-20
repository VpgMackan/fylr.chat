"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ListPageLayout, {
  DropdownOption,
} from "@/components/layout/ListPageLayout";
import Summarie from "@/components/SummaryListItem";

export default function SummariePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const summarieT = useTranslations("pages.summariesList");
  const commonT = useTranslations("common");

  useEffect(() => {
    params.then((res) => setId(res.id));
  }, [params]);

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: "Most recent" },
    { value: 2, label: "Title" },
    { value: 3, label: "Most sources" },
  ];

  return (
    <ListPageLayout
      title={summarieT("yourSummaries", { pocketName: "Lorem" })}
      onBack={() => router.back()}
      onCreate={() => router.push("/pocket/new")}
      createText={commonT("buttons.create")}
      searchLabel={summarieT("searchLabel")}
      clearSearchLabel={summarieT("clearSearchLabel")}
      dropdownOptions={dropdownOptions}
    >
      <Summarie
        title="🧠 Lorem"
        pocket="Lorem"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
      />
    </ListPageLayout>
  );
}
