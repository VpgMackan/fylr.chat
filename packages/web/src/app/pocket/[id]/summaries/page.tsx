"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import Summarie from "@/components/Summarie";

import SearchBar from "@/components/SearchBar";
import Dropdown from "@/components/common/Dropdown";

export default function PodcastsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdwonValue, setDropdownValue] = useState("");
  const [id, setId] = useState<string | null>(null);

  const router = useRouter();

  const podcastsT = useTranslations("pages.summariesList");
  const commonT = useTranslations("common");

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleDropdownChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setDropdownValue(event.target.value);
  };

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
    });
  }, [params]);

  return (
    <div>
      <div className="flex text-5xl items-center">
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
        <p className="ml-8 font-bold">
          {podcastsT("yourSummareis", { pocketName: "Lorem" })}
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder={podcastsT("searchLabel")}
            ariaLabel={podcastsT("searchLabel")}
            clearLabel={podcastsT("clearSearchLabel")}
          />
          <Dropdown
            options={[
              { value: 1, label: "Most recent" },
              { value: 2, label: "Title" },
              { value: 3, label: "Most sources" },
            ]}
            selectedValue={dropdwonValue}
            onChange={handleDropdownChange}
            placeholder="Select an option..."
            ariaLabel="Choose an item"
            className="mr-2"
          />
          <Button
            text={commonT("buttons.create")}
            onClick={() => router.push("/pocket/new")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Summarie
            title="🧠 Lorem"
            pocket="Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
          />
        </div>
      </div>
    </div>
  );
}
