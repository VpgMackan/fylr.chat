'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

function Button({ name, icon }: { name: string; icon?: string }) {
  return (
    <div className="w-full">
      <button className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2">
        {icon && <Icon icon={icon} width="20" height="20" />}
        {name}
      </button>
    </div>
  );
}

interface DropdownProps {
  options: string[];
  defaultOption?: string;
}

function Dropdown({ options, defaultOption }: DropdownProps) {
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

function Conversation({ name, selected }: { name: string; selected: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`px-3 py-2 rounded-lg cursor-pointer transition-colors relative group ${
        selected ? 'bg-blue-200' : 'hover:bg-blue-300'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-800 truncate pr-2">{name}</p>
        <button
          className={`flex-shrink-0 p-1 hover:bg-blue-300 rounded transition-all ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Icon
            icon="heroicons-solid:dots-horizontal"
            width="16"
            height="16"
            className="text-gray-600"
          />
        </button>
      </div>
    </div>
  );
}

function RecentLibrary({ name }: { name: string }) {
  return (
    <div className="relative bg-blue-100 border-2 border-blue-300 rounded-lg p-6 w-32 h-32 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="absolute bottom-3 right-3 w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="text-xs text-gray-600 font-medium">{name}</div>
    </div>
  );
}

function ChatInput({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col bg-blue-200 rounded-2xl border border-blue-300 shadow-md">
        <textarea
          className="w-full bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none p-3 overflow-y-auto min-h-[44px] max-h-40"
          placeholder="Ask anything"
          rows={1}
        />

        <div className="flex items-center justify-between p-2 pt-0">
          <div className="flex gap-2">
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:plus" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:web" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:dots-horizontal" width="20" height="20" />
            </button>
          </div>

          <div className="flex gap-4">
            <button className="p-2 bg-blue-300 rounded-full hover:bg-blue-500">
              <Icon icon="mdi:microphone" width="20" height="20" />
            </button>
            <button className="p-2 bg-blue-500 rounded-full hover:bg-blue-700">
              <Icon icon="mdi:arrow-up" width="20" height="20" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex h-screen">
      <div className="bg-blue-100 p-2 flex flex-col h-full">
        <div className="flex flex-col gap-2">
          <div>
            {/* QUICK CREATE BUTTON (OPENS MODAL FOR Library CREATION AND CONTENT CREATION) */}
            <Button name="Create content" icon="heroicons-solid:plus-sm" />
          </div>
          <div>
            {/* Library selection menu. Select a Library to be used in a conversation*/}
            <Button name="Select library" icon="heroicons-solid:collection" />
          </div>
        </div>

        {/* Divider */}
        <hr className="my-2 text-gray-600" />

        <div className="mb-3">
          {/* Dropdown to show content */}
          <Dropdown
            options={['Conversations', 'Summaries', 'Podcasts']}
            defaultOption="Conversations"
          />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-1">
            {/* Item list */}
            <Conversation name="Hello" selected={false} />
          </div>
        </div>

        <div className="mt-auto pt-2">
          {/** Settings button */}
          <Button name="Account" icon="heroicons:user-16-solid" />
        </div>
      </div>

      <div className="w-full flex justify-center">
        <div className="flex flex-col justify-center items-center">
          <div className="flex gap-2">
            {/** Recently used Librarys */}
            <RecentLibrary name="Library 1" />
            <RecentLibrary name="Library 2" />
            <RecentLibrary name="Library 3" />
          </div>
          <div className="mt-3 w-full flex justify-center">
            {/** Input field */}
            <ChatInput className="w-full max-w-[25rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
