"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import Chat from "@/components/Chat";

import SearchBar from "@/components/SearchBar";
import Dropdown from "@/components/common/Dropdown";
import Heading from "@/components/layout/Heading";

export default function ChatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdwonValue, setDropdownValue] = useState("");
  const [id, setId] = useState<string | null>(null);

  const router = useRouter();

  const chatsT = useTranslations("pages.chatsList");
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
    <Heading
      title={chatsT("yourSummareis", { pocketName: "Lorem" })}
      infrontTitle={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
    >
      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder={chatsT("searchLabel")}
            ariaLabel={chatsT("searchLabel")}
            clearLabel={chatsT("clearSearchLabel")}
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
          <Chat
            title="🧠 Lorem"
            pocket="Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
          />
        </div>
      </div>
    </Heading>
  );
}
