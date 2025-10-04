'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface DropdownProps {
  options: string[];
  defaultOption?: string;
}

export default function Dropdown({ options, defaultOption }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultOption || options[0]);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <Icon icon="heroicons-solid:menu-alt-2" width="20" height="20" />
          {selected}
        </span>
        <Icon
          icon={
            open ? 'heroicons-solid:chevron-up' : 'heroicons-solid:chevron-down'
          }
          width="20"
          height="20"
        />
      </button>

      {open && (
        <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelected(option);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-blue-50 transition ${
                selected === option
                  ? 'text-blue-500 font-semibold'
                  : 'text-gray-700'
              }`}
            >
              <Icon
                icon={
                  option === 'Content'
                    ? 'heroicons-solid:document-text'
                    : option === 'Summaries'
                      ? 'heroicons-solid:book-open'
                      : 'heroicons-solid:music-note'
                }
                width="18"
                height="18"
              />
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
