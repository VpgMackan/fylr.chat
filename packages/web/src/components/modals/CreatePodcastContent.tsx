'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';

export interface CreateSummaryContentRef {
  handleCreate: () => Promise<void>;
  isCreating: boolean;
  canCreate: boolean;
}

const CreateSummaryContent = forwardRef<CreateSummaryContentRef>(
  (props, ref) => {
    const [summaryName, setSummaryName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleCreate = async () => {
      setIsCreating(true);
      setError(null);

      try {
        //router.push(`/summary/${summary.id}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred while creating the suimmary',
        );
        throw err;
      } finally {
        setIsCreating(false);
      }
    };

    useImperativeHandle(ref, () => ({
      handleCreate,
      isCreating,
      canCreate: summaryName.trim().length > 0,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Create New Summary</h2>
          <p className="text-gray-600">
            Create a new summary to quickly understand different topics
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
              htmlFor="summary-name"
              className="block text-sm font-medium mb-2"
            >
              Summary Name
            </label>
            <input
              id="summary-name"
              type="text"
              value={summaryName}
              onChange={(e) => setSummaryName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3"
              placeholder="Enter summary name"
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
            </label>
          </div>

          {/* Display selected files */}
        </div>
      </div>
    );
  },
);

CreateSummaryContent.displayName = 'CreateSummaryContent';

export default CreateSummaryContent;
