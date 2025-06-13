import React from "react";
import { Icon } from "@iconify/react";

interface SearchBarProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  placeholder?: string;
  ariaLabel?: string;
  clearLabel?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder,
  ariaLabel,
  clearLabel,
}) => {
  return (
    <div className="relative flex-grow">
      <Icon
        icon="mdi:search"
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-2xl pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="border border-gray-300 rounded-lg py-2 px-4 pl-10 text-2xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
          aria-label={clearLabel}
        >
          <Icon icon="mdi:close" className="text-2xl" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
