import { ReactNode, useState } from "react";
import { Icon } from "@iconify/react";
import Button from "@/components/common/Button";
import SearchBar from "@/components/SearchBar";
import Dropdown from "@/components/common/Dropdown";
import Heading from "@/components/layout/Heading";

export type DropdownOption = { value: string | number; label: string };

interface ListPageLayoutProps {
  title: string;
  onBack?: () => void;
  onCreate: () => void;
  createText: string;
  searchLabel: string;
  clearSearchLabel: string;
  dropdownOptions: DropdownOption[];
  dropdownPlaceholder?: string;
  dropdownAriaLabel?: string;
  gridClassName?: string;
  children: ReactNode;
}

export default function ListPageLayout({
  title,
  onBack,
  onCreate,
  createText,
  searchLabel,
  clearSearchLabel,
  dropdownOptions,
  dropdownPlaceholder,
  dropdownAriaLabel,
  gridClassName = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  children,
}: ListPageLayoutProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownValue, setDropdownValue] = useState<string | number>("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchTerm(e.target.value);
  const handleClear = () => setSearchTerm("");
  const handleDropdown = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setDropdownValue(e.target.value);

  return (
    <Heading
      title={title}
      infrontTitle={
        onBack && <Icon icon="weui:back-outlined" onClick={onBack} />
      }
    >
      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClear}
            placeholder={searchLabel}
            ariaLabel={searchLabel}
            clearLabel={clearSearchLabel}
          />
          <Dropdown
            options={dropdownOptions}
            selectedValue={dropdownValue}
            onChange={handleDropdown}
            placeholder={dropdownPlaceholder}
            ariaLabel={dropdownAriaLabel}
            className="mr-2"
          />
          <Button text={createText} onClick={onCreate} />
        </div>
        <div className={`grid ${gridClassName} gap-4`}>{children}</div>
      </div>
    </Heading>
  );
}
