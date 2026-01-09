'use client';

import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { SourceApiResponse } from '@fylr/types';
import {
  deleteSource,
  updateSource,
  uploadSourceToLibrary,
} from '@/services/api/source.api';
import { toast } from 'react-hot-toast';
import SmallModal from './SmallModal';

interface ManageSourcesModalProps {
  libraryId: string;
  sources: SourceApiResponse[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManageSourcesModal({
  libraryId,
  sources,
  onClose,
  onUpdate,
}: ManageSourcesModalProps) {
  const [localSources, setLocalSources] = useState(sources);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async (sourceId: string, sourceName: string) => {
    if (!confirm(`Are you sure you want to delete "${sourceName}"?`)) return;

    setDeleting(sourceId);
    try {
      await deleteSource(sourceId);
      setLocalSources((prev) => prev.filter((s) => s.id !== sourceId));
      toast.success('Source deleted successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to delete source:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete source');
    } finally {
      setDeleting(null);
    }
  };

  const handleStartEdit = (source: SourceApiResponse) => {
    setEditingId(source.id);
    setEditName(source.name);
  };

  const handleSaveEdit = async (sourceId: string) => {
    if (!editName.trim()) {
      toast.error('Source name cannot be empty');
      return;
    }

    try {
      const updated = await updateSource(sourceId, { name: editName.trim() });
      setLocalSources((prev) =>
        prev.map((s) => (s.id === sourceId ? updated : s)),
      );
      setEditingId(null);
      toast.success('Source renamed successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update source:', error);
      toast.error(error?.response?.data?.message || 'Failed to update source');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const fileArray = Array.from(files);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of fileArray) {
        try {
          const result = await uploadSourceToLibrary(libraryId, file);
          setLocalSources((prev) => [...prev, result.database]);
          successCount++;
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `${successCount} source${successCount > 1 ? 's' : ''} uploaded successfully`,
        );
        onUpdate();
      }

      if (failCount > 0) {
        toast.error(
          `${failCount} source${failCount > 1 ? 's' : ''} failed to upload`,
        );
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <SmallModal
      onClose={onClose}
      accent="blue"
      title="Manage Sources"
      icon="mdi:folder-edit"
      footerText={`${localSources.length} source${localSources.length !== 1 ? 's' : ''} in this library`}
    >
      {/* Upload Section */}
      <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Add Sources
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Upload PDF, TXT, Markdown, DOCX, or PPTX files
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Icon
            icon={uploading ? 'mdi:loading' : 'mdi:upload'}
            className={`text-xl ${uploading ? 'animate-spin' : ''}`}
          />
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown,.docx,.pptx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Sources List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Library Sources ({localSources.length})
          </h3>
        </div>

        {localSources.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
            <Icon
              icon="mdi:folder-open-outline"
              className="text-6xl text-gray-400 dark:text-gray-600 mx-auto mb-4"
            />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              No sources yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Click &quot;Upload Files&quot; above to add your first source
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {localSources.map((source) => (
              <div
                key={source.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
              >
                {editingId === source.id ? (
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="mdi:file-document-edit"
                      className="text-2xl text-blue-600 dark:text-blue-400 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(source.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(source.id)}
                      className="p-2.5 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      title="Save"
                    >
                      <Icon icon="mdi:check" className="text-xl" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <Icon icon="mdi:close" className="text-xl" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                        <Icon
                          icon="mdi:file-document"
                          className="text-2xl text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {source.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:file-outline" />
                            {(parseInt(source.size) / 1024).toFixed(0)} KB
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:calendar" />
                            {new Date(source.uploadTime).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              source.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : source.status === 'FAILED'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {source.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleStartEdit(source)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Rename"
                      >
                        <Icon icon="mdi:pencil" className="text-xl" />
                      </button>
                      <button
                        onClick={() => handleDelete(source.id, source.name)}
                        disabled={deleting === source.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <Icon
                          icon={
                            deleting === source.id
                              ? 'mdi:loading'
                              : 'mdi:delete'
                          }
                          className={`text-xl ${deleting === source.id ? 'animate-spin' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SmallModal>
  );
}
