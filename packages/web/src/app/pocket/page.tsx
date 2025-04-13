"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useState } from "react";

import { redirect } from "next/navigation";

import Button from "@/components/Button";
import Pocket from "@/components/Pocket";
import SearchBar from "@/components/SearchBar";
import Dropdown from "@/components/Dropdown";


export default function PocketPage() {
  const common = useTranslations("common");
  const t = useTranslations("PocketPage");
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdwonValue, setDropdownValue] = useState("");

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

  return (
    <div>
      <div className="flex text-5xl items-center">
        <Icon icon="weui:back-outlined" onClick={() => redirect("/")} />
        <p className="ml-8 font-bold">{common("yourPockets")}</p>
      </div>

      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder={t("searchPocketsPlaceholder")}
            ariaLabel={t("searchPocketsLabel")}
            clearLabel={t("clearSearchLabel")}
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
          <Button text={common("createNew")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Pocket
            title="🧠 Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            sources={12}
            created="2025/04/13"
          />
        </div>
      </div>
    </div>
  );
}
