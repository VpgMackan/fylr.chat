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
  const [userRole, setUserRole] = useState<'FREE' | 'PRO' | null>(null);
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreate = libraryName.trim().length > 0;
  const maxSources = userRole === 'PRO' ? Infinity : 50;

  useEffect(() => {
    onCanCreateChange(canCreate);
  }, [canCreate, onCanCreateChange]);

  useEffect(() => {
    // Fetch user profile to get role
    const fetchUserRole = async () => {
      try {
        const response = await axios.get('/auth/profile');
        setUserRole(response.data.role || 'FREE');
      } catch (err) {
        console.error('Failed to fetch user role:', err);
        setUserRole('FREE'); // Default to FREE on error
      }
    };
    fetchUserRole();
  }, []);

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

      // Upload sources sequentially to avoid race conditions and provide better error handling
      if (sourceFiles.length > 0) {
        let uploadedCount = 0;
        for (const source of sourceFiles) {
          try {
            await uploadSource(library.id, source.file);
            uploadedCount++;
          } catch (uploadErr: any) {
            // If we hit the limit, show appropriate message
            if (uploadErr.response?.status === 403) {
              setError(
                `Successfully uploaded ${uploadedCount} source(s). ${uploadErr.response?.data?.message || 'You have reached the limit for your plan.'}`,
              );
              break;
            }
            throw uploadErr;
          }
        }
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
          <label
            htmlFor="source-button"
            className="block text-sm font-medium mb-2"
          >
            Sources
            {userRole === 'PRO' ? (
              <span className="text-xs text-gray-500 ml-2">
                ({sourceFiles.length} - unlimited)
              </span>
            ) : (
              <span className="text-xs text-gray-500 ml-2">
                ({sourceFiles.length}/{maxSources})
              </span>
            )}
          </label>
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
              ? 'Maximum Sources Reached'
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
