'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createSummary } from '@/services/api/summary.api';
import { Icon } from '@iconify/react';
import { CreateSummaryEpisodeDto } from '@fylr/types';
import Button from '../common/Button';

interface CreateSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pocketId: string;
  onSuccess: (summaryId: string) => void;
}

export default function CreateSummaryModal({
  isOpen,
  onClose,
  pocketId,
  onSuccess,
}: CreateSummaryModalProps) {
  const [title, setTitle] = useState('');
  const [episodes, setEpisodes] = useState<
    (CreateSummaryEpisodeDto & { key: number })[]
  >([{ key: Date.now(), title: '', focus: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const t = useTranslations('modals.createSummary');
  const commonT = useTranslations('common');

  if (!isOpen) return null;

  const handleAddEpisode = () => {
    setEpisodes([...episodes, { key: Date.now(), title: '', focus: '' }]);
  };

  const handleRemoveEpisode = (key: number) => {
    if (episodes.length > 1) {
      setEpisodes(episodes.filter((e) => e.key !== key));
    }
  };

  const handleEpisodeChange = (
    key: number,
    field: 'title' | 'focus',
    value: string,
  ) => {
    setEpisodes(
      episodes.map((e) => (e.key === key ? { ...e, [field]: value } : e)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || episodes.some((ep) => !ep.title.trim())) {
      setError(t('validationError'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const summaryData = {
        title,
        episodes: episodes.map(({ key, ...rest }) => rest),
      };
      const response = await createSummary(pocketId, summaryData);
      onSuccess(response.id);
      handleClose();
    } catch (err) {
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonSubmit = async () => {
    if (!title.trim() || episodes.some((ep) => !ep.title.trim())) {
      setError(t('validationError'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const summaryData = {
        title,
        episodes: episodes.map(({ key, ...rest }) => rest),
      };
      const response = await createSummary(pocketId, summaryData);
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
    setEpisodes([{ key: Date.now(), title: '', focus: '' }]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-semibold mb-4">{t('title')}</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="mb-4">
            <label htmlFor="summaryTitle" className="form-label">
              {t('summaryTitleLabel')}
            </label>
            <input
              id="summaryTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('summaryTitlePlaceholder')}
              className="form-input"
              disabled={isLoading}
              required
            />
          </div>

          <div className="mb-4">
            <h3 className="form-label">{t('episodesLabel')}</h3>
            <div className="space-y-3">
              {episodes.map((episode, index) => (
                <div key={episode.key} className="p-3 border rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">
                      {t('episodeCount', { count: index + 1 })}
                    </p>
                    {episodes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEpisode(episode.key)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Icon icon="mdi:close-circle-outline" />
                      </button>
                    )}
                  </div>
                  <label
                    htmlFor={`epTitle-${episode.key}`}
                    className="form-label text-xs"
                  >
                    {t('episodeTitleLabel')}
                  </label>
                  <input
                    id={`epTitle-${episode.key}`}
                    type="text"
                    value={episode.title}
                    onChange={(e) =>
                      handleEpisodeChange(episode.key, 'title', e.target.value)
                    }
                    placeholder={t('episodeTitlePlaceholder')}
                    className="form-input"
                    disabled={isLoading}
                    required
                  />
                  <label
                    htmlFor={`epFocus-${episode.key}`}
                    className="form-label text-xs mt-2"
                  >
                    {t('episodeFocusLabel')}
                  </label>
                  <input
                    id={`epFocus-${episode.key}`}
                    type="text"
                    value={episode.focus}
                    onChange={(e) =>
                      handleEpisodeChange(episode.key, 'focus', e.target.value)
                    }
                    placeholder={t('episodeFocusPlaceholder')}
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={handleAddEpisode}
              text={t('addEpisode')}
              className="mt-2 w-full text-sm"
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
