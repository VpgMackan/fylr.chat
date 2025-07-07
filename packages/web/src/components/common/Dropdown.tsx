import React from 'react';
import { Select } from '@headlessui/react';

interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  selectedValue: string | number | undefined;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function Dropdown({
  options,
  selectedValue,
  onChange,
  placeholder,
  disabled = false,
  className,
  ariaLabel,
}: DropdownProps) {
  return (
    <div className={`relative inline-block ${className || ''}`}>
      <Select
        className="appearance-none border border-gray-300 rounded-lg py-2 px-4 pr-8 text-2xl hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
        value={selectedValue ?? ''}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg
          className="fill-current h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path d="M5.516 7.548c.436-.446 1.143-.446 1.579 0L10 10.405l2.905-2.857c.436-.446 1.143-.446 1.579 0 .436.445.436 1.167 0 1.612l-3.694 3.63c-.436.446-1.143.446-1.579 0L5.516 9.16c-.436-.445-.436-1.167 0-1.612z" />
        </svg>
      </div>
    </div>
  );
}
