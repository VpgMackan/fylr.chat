'use client';

import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';
import { useUsageStats } from '@/hooks/useUsageStats';
import Link from 'next/link';

interface SourceFile {
  file: File;
  id: string;
}

export interface CreateLibraryContentRef {
  handleCreate: () => Promise<void>;
  isCreating: boolean;
  canCreate: boolean;
}

interface CreateLibraryContentProps {
  onCanCreateChange: (canCreate: boolean) => void;
}

const CreateLibraryContent = forwardRef<
  CreateLibraryContentRef,
  CreateLibraryContentProps
>(({ onCanCreateChange }, ref) => {
  const [libraryName, setLibraryName] = useState('');
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredCount, setDeferredCount] = useState(0);
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useUsageStats();

  const canCreate = libraryName.trim().length > 0;
  const maxSources = stats?.role === 'PRO' ? Infinity : 50;

  useEffect(() => {
    onCanCreateChange(canCreate);
  }, [canCreate, onCanCreateChange]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
      }));

      // Check limit based on user role
      const totalFiles = sourceFiles.length + newFiles.length;

      if (maxSources !== Infinity && totalFiles > maxSources) {
        const allowedCount = Math.max(0, maxSources - sourceFiles.length);
        if (allowedCount > 0) {
          setSourceFiles((prev) => [
            ...prev,
            ...newFiles.slice(0, allowedCount),
          ]);
          setError(
            `You can only add up to ${maxSources} sources per library on the free plan. Only ${allowedCount} file(s) were added.`,
          );
        } else {
          setError(
            `You can only add up to ${maxSources} sources per library on the free plan.`,
          );
        }
      } else {
        setSourceFiles((prev) => [...prev, ...newFiles]);
        setError(null);
      }
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

  const handleCreate = async () => {
    if (!libraryName.trim()) {
      setError('Please enter a library name');
      return;
    }

    setIsCreating(true);
    setError(null);
    setDeferredCount(0);

    try {
      const libraryData = {
        title: libraryName,
        description: 'test',
        icon: 'mdi:folder',
        tags: ['test'],
        defaultEmbeddingModel: 'jina-clip-v2',
      };

      const response = await axios.post('/library', libraryData);
      const library = response.data;

      // Upload sources sequentially to provide better tracking
      if (sourceFiles.length > 0) {
        let uploadedCount = 0;
        let deferredSourceCount = 0;

        for (const source of sourceFiles) {
          try {
            const result = await uploadSource(library.id, source.file);
            uploadedCount++;
            if (result.deferred) {
              deferredSourceCount++;
            }
          } catch (uploadErr: any) {
            console.error('Error uploading source:', uploadErr);
            // Continue uploading other files even if one fails
          }
        }

        setDeferredCount(deferredSourceCount);

        if (deferredSourceCount > 0) {
          setError(
            `Successfully uploaded ${uploadedCount} source(s). ${deferredSourceCount} file(s) will be processed when your daily limit resets or you can manually trigger ingestion.`,
          );
        }

        // Refetch stats after uploads
        refetchStats();
      }

      setLibraryName('');
      setSourceFiles([]);

      router.push(`/library/${library.id}`);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        (err instanceof Error
          ? err.message
          : 'An error occurred while creating the library');
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleCreate,
    isCreating,
    canCreate,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Create New Library</h2>
        <p className="text-gray-600">
          Add a library to organize your sources and content
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="library-name"
            className="block text-sm font-medium mb-2"
          >
            Library Name
          </label>
          <input
            id="library-name"
            type="text"
            value={libraryName}
            onChange={(e) => setLibraryName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
            placeholder="Enter library name"
            required
            disabled={isCreating}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="source-button"
              className="block text-sm font-medium"
            >
              Sources
              {stats && (
                <span className="text-xs text-gray-500 ml-2">
                  ({sourceFiles.length}/
                  {maxSources === Infinity ? '∞' : maxSources} per library)
                </span>
              )}
            </label>
            {stats && (
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`font-medium ${
                    stats.usage.dailySourceUploads >=
                    stats.limits.dailySourceUploads
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {stats.limits.dailySourceUploads === null
                    ? ''
                    : 'Daily uploads: ' +
                      stats.usage.dailySourceUploads +
                      '/' +
                      stats.limits.dailySourceUploads}
                </span>
                {stats.role === 'FREE' && (
                  <Link
                    href="/settings?tab=subscription"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Upgrade to Pro
                  </Link>
                )}
              </div>
            )}
          </div>

          {stats &&
            stats.usage.dailySourceUploads >= stats.limits.dailySourceUploads &&
            stats.role === 'FREE' && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <Icon
                    icon="mdi:information"
                    className="text-yellow-600 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Daily upload limit reached
                    </p>
                    <p className="text-yellow-700 mt-1">
                      You can still upload files, but they will be saved and
                      processed when your limit resets or you can manually
                      trigger ingestion later.
                    </p>
                  </div>
                </div>
              </div>
            )}

          <button
            id="source-button"
            type="button"
            onClick={handleSourceButtonClick}
            disabled={
              isCreating ||
              (maxSources !== Infinity && sourceFiles.length >= maxSources)
            }
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {maxSources !== Infinity && sourceFiles.length >= maxSources
              ? 'Maximum Sources Per Library Reached'
              : 'Add Sources'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.markdown,.docx,.pptx"
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
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sourceFiles.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
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
    </div>
  );
});

CreateLibraryContent.displayName = 'CreateLibraryContent';

export default CreateLibraryContent;
