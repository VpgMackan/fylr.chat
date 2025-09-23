'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPodcast } from '@/services/api/podcast.api';
import { Icon } from '@iconify/react';
import { CreatePodcastDto } from '@fylr/types';
import Button from '../common/Button';

interface CreatePodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  pocketId: string;
  onSuccess: (podcastId: string) => void;
}

export default function CreatePodcastModal({
  isOpen,
  onClose,
  pocketId,
  onSuccess,
}: CreatePodcastModalProps) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const t = useTranslations('modals.createPodcast');
  const commonT = useTranslations('common');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('validationError'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const podcastData = {
        title,
      };
      const response = await createPodcast(pocketId, podcastData);
      onSuccess(response.id);
      handleClose();
    } catch (err) {
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonSubmit = async () => {
    if (!title.trim()) {
      setError(t('validationError'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const podcastData = {
        title,
      };
      const response = await createPodcast(pocketId, podcastData);
      onSuccess(response.id);
      handleClose();
    } catch (err) {
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-semibold mb-4">{t('title')}</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="mb-4">
            <label htmlFor="podcastTitle" className="form-label">
              {t('podcastTitleLabel')}
            </label>
            <input
              id="podcastTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('podcastTitlePlaceholder')}
              className="form-input"
              disabled={isLoading}
              required
            />
          </div>

          {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
        </form>
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            onClick={handleClose}
            text={commonT('buttons.cancel')}
            disabled={isLoading}
          />
          <Button
            type="button"
            onClick={handleButtonSubmit}
            text={isLoading ? t('creating') : commonT('buttons.create')}
            disabled={isLoading || !title.trim()}
          />
        </div>
      </div>
      <style jsx>{`
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4a5568;
          margin-bottom: 0.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 0.375rem;
        }
        .form-input:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 1px #4299e1;
        }
      `}</style>
    </div>
  );
}
