'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface ConversationOptionsMenuProps {
  conversationId: string;
  conversationName: string;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ConversationOptionsMenu({
  conversationId,
  conversationName,
  onRename,
  onDelete,
}: ConversationOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(conversationName);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsRenaming(false);
        setNewName(conversationName);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, conversationName]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        await onDelete(conversationId);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        alert('Failed to delete conversation. Please try again.');
      }
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (newName.trim() && newName !== conversationName) {
      try {
        await onRename(conversationId, newName.trim());
        setIsRenaming(false);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to rename conversation:', error);
        alert('Failed to rename conversation. Please try again.');
      }
    } else {
      setIsRenaming(false);
      setNewName(conversationName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsRenaming(false);
      setNewName(conversationName);
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggleMenu}
        className="flex-shrink-0 p-1.5 hover:bg-white/30 rounded-lg transition-all duration-200"
        aria-label="Options menu"
      >
        <Icon
          icon="heroicons-solid:dots-horizontal"
          width="16"
          height="16"
          className="text-current"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[160px] overflow-hidden animate-fadeIn">
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="p-3">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRenaming(false);
                    setNewName(conversationName);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                onClick={handleRenameClick}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
              >
                <Icon
                  icon="heroicons-solid:pencil"
                  width="16"
                  height="16"
                  className="text-blue-500"
                />
                <span className="font-medium">Rename</span>
              </button>
              <div className="h-px bg-gray-100 mx-2"></div>
              <button
                onClick={handleDeleteClick}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
              >
                <Icon icon="heroicons-solid:trash" width="16" height="16" />
                <span className="font-medium">Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
