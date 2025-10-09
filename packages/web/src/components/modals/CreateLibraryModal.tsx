'use client';

import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';

interface SourceFile {
  file: File;
  id: string;
}

interface CreateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLibraryModal({
  isOpen,
  onClose,
}: CreateLibraryModalProps) {
  const [libraryName, setLibraryName] = useState('');
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
      }));
      setSourceFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setSourceFiles((prev) => prev.filter((source) => source.id !== id));
  };

  const handleSourceButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadSource = async (libraryId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('libraryId', libraryId);

    const response = await axios.post('/source', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const libraryData = {
        title: libraryName,
        description: 'test',
        icon: 'mdi:folder',
        tags: ['test'],
      };

      const response = await axios.post('/library', libraryData);
      const library = response.data;

      // Upload sources if any
      if (sourceFiles.length > 0) {
        const uploadPromises = sourceFiles.map((source) =>
          uploadSource(library.id, source.file),
        );

        await Promise.all(uploadPromises);
      }

      onClose();
      setLibraryName('');
      setSourceFiles([]);

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while creating the library',
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Create New Library</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="library-name"
                className="block text-sm font-medium"
              >
                Library Name
              </label>
              <input
                id="library-name"
                type="text"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 mt-1"
                required
                disabled={isCreating}
              />
            </div>

            <div>
              <label
                htmlFor="source-button"
                className="block text-sm font-medium mb-1"
              >
                Sources
              </label>
              <button
                id="source-button"
                type="button"
                onClick={handleSourceButtonClick}
                disabled={isCreating}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Add Sources
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md"
                onChange={handleFileSelection}
                className="hidden"
              />
            </div>

            {/* Display selected files */}
            {sourceFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Selected Sources ({sourceFiles.length})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sourceFiles.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                    >
                      <div className="flex items-center">
                        <Icon
                          icon="mdi:file-document"
                          className="text-blue-500 mr-2"
                        />
                        <span className="text-sm">{source.file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(source.file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(source.id)}
                        disabled={isCreating}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-400"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !libraryName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
