'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '../ui/Button';

interface ItemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentItemName: string;
  itemType: string; // e.g., "podcast" or "summary"
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function ItemSettingsModal({
  isOpen,
  onClose,
  currentItemName,
  itemType,
  onRename,
  onDelete,
}: ItemSettingsModalProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentItemName);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when modal opens
  const handleModalOpen = () => {
    setIsRenaming(false);
    setNewName(currentItemName);
    setShowDeleteConfirm(false);
  };

  // Update newName when currentItemName changes
  if (isOpen && !isRenaming && newName !== currentItemName) {
    setNewName(currentItemName);
  }

  const handleRenameClick = () => {
    setIsRenaming(true);
  };

  const handleRenameSave = async () => {
    if (newName.trim() && newName !== currentItemName) {
      try {
        await onRename(newName.trim());
        setIsRenaming(false);
        onClose();
      } catch (error) {
        // Error handling is done in the parent component
        console.error('Rename failed:', error);
      }
    } else {
      setIsRenaming(false);
    }
  };

  const handleRenameCancel = () => {
    setNewName(currentItemName);
    setIsRenaming(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Delete failed:', error);
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleClose = () => {
    if (!isDeleting) {
      handleModalOpen();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {itemType} Settings
          </h2>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <Icon icon="heroicons:x-mark-20-solid" width="24" height="24" />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <div className="space-y-4">
            {/* Rename Section */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Rename {itemType}
              </h3>
              {isRenaming ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameSave();
                      } else if (e.key === 'Escape') {
                        handleRenameCancel();
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${itemType} name`}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      name="Save"
                      onClick={handleRenameSave}
                      disabled={!newName.trim() || newName === currentItemName}
                    />
                    <Button
                      name="Cancel"
                      variant="secondary"
                      onClick={handleRenameCancel}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 truncate flex-1 mr-4">
                    {currentItemName}
                  </p>
                  <button
                    onClick={handleRenameClick}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Icon
                      icon="heroicons:pencil-16-solid"
                      width="16"
                      height="16"
                    />
                    Rename
                  </button>
                </div>
              )}
            </div>

            {/* Delete Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Delete {itemType}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                This action cannot be undone. All associated data will be
                permanently deleted.
              </p>
              <Button
                name={`Delete ${itemType}`}
                icon="heroicons:trash-16-solid"
                variant="secondary"
                onClick={handleDeleteClick}
              />
            </div>
          </div>
        ) : (
          // Delete Confirmation
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icon
                  icon="heroicons:exclamation-triangle-16-solid"
                  width="24"
                  height="24"
                  className="text-red-600 mt-0.5"
                />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Confirm Deletion
                  </h3>
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete "{currentItemName}"? This
                    action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                name={isDeleting ? 'Deleting...' : 'Yes, Delete'}
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              />
              <Button
                name="Cancel"
                variant="secondary"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
