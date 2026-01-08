'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';
import { toast } from 'react-hot-toast';

interface LibraryRequiringMigration {
  id: string;
  title: string;
  model: string;
  reason: 'deprecated' | 'unknown' | 'not-default';
}

interface MigrationResponse {
  defaultModel: string;
  deprecated: LibraryRequiringMigration[];
  nonDefault: LibraryRequiringMigration[];
}

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MigrationModal({
  isOpen,
  onClose,
}: MigrationModalProps) {
  const [allLibraries, setAllLibraries] = useState<LibraryRequiringMigration[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [migratingIds, setMigratingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLibrariesRequiringMigration();
    }
  }, [isOpen]);

  const fetchLibrariesRequiringMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/library/requiring-migration');
      const data = response.data as MigrationResponse;
      setAllLibraries([...data.deprecated, ...data.nonDefault]);
    } catch (err: any) {
      console.error('Failed to fetch libraries requiring migration:', err);
      setError(
        err.response?.data?.message ||
          'Failed to fetch libraries requiring migration',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateLibrary = async (libraryId: string) => {
    setMigratingIds((prev) => new Set(prev).add(libraryId));

    try {
      await axios.post(`/library/${libraryId}/update-model`);
      setAllLibraries((prev) => prev.filter((lib) => lib.id !== libraryId));
      toast.success('Library migration started successfully');
    } catch (err: any) {
      console.error('Failed to migrate library:', err);
      toast.error(err.response?.data?.message || 'Failed to migrate library');
    } finally {
      setMigratingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(libraryId);
        return newSet;
      });
    }
  };

  const handleMigrateAll = async () => {
    try {
      setMigratingIds(new Set(allLibraries.map((lib) => lib.id)));

      for (const library of allLibraries) {
        await axios.post(`/library/${library.id}/update-model`);
      }

      setAllLibraries([]);
      toast.success('All libraries migration started successfully');
    } catch (err: any) {
      console.error('Failed to migrate all libraries:', err);
      toast.error(err.response?.data?.message || 'Failed to migrate libraries');
      fetchLibrariesRequiringMigration();
    } finally {
      setMigratingIds(new Set());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Icon
                icon="mdi:database-arrow-right"
                className="text-2xl text-orange-600 dark:text-orange-400"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Libraries Requiring Migration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-all"
            aria-label="Close"
          >
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
              <div className="flex items-center gap-2">
                <Icon
                  icon="mdi:alert-circle"
                  className="w-5 h-5 flex-shrink-0"
                />
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Icon
                  icon="mdi:loading"
                  className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2"
                />
                <p className="text-gray-600 dark:text-gray-400">
                  Loading libraries...
                </p>
              </div>
            </div>
          ) : allLibraries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
              <Icon
                icon="mdi:check-circle-outline"
                className="text-6xl text-green-500 mx-auto mb-4"
              />
              <p className="text-gray-900 dark:text-white text-lg mb-2 font-semibold">
                No Migration Required
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                All your libraries are up to date
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allLibraries.map((library) => (
                <div
                  key={library.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {library.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Model: {library.model}
                        {library.reason === 'deprecated' && ' (deprecated)'}
                        {library.reason === 'unknown' && ' (unknown)'}
                        {library.reason === 'not-default' && ' (not default)'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMigrateLibrary(library.id)}
                      disabled={migratingIds.has(library.id)}
                      className="flex-shrink-0 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      {migratingIds.has(library.id) ? (
                        <>
                          <Icon icon="mdi:loading" className="animate-spin" />
                          Migrating...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:play" />
                          Migrate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {allLibraries.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {allLibraries.length} library
              {allLibraries.length !== 1 ? 'ies' : ''} ready to migrate
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all font-medium"
              >
                Close
              </button>
              <button
                onClick={handleMigrateAll}
                disabled={migratingIds.size > 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
              >
                <Icon icon="mdi:database-multiple" />
                Migrate All
              </button>
            </div>
          </div>
        )}

        {allLibraries.length === 0 && !loading && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
