import { Dialog, DialogBackdrop } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import Button from '@/components/common/Button';

interface EditPocketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pocketName: string;
  pocketDescription: string;
  pocketTags: string;
  setPocketName: (name: string) => void;
  setPocketDescription: (description: string) => void;
  setPocketTags: (tags: string) => void;
  onSave: () => void;
}

export default function EditPocketDialog({
  isOpen,
  onClose,
  pocketName,
  pocketDescription,
  pocketTags,
  setPocketName,
  setPocketDescription,
  setPocketTags,
  onSave,
}: EditPocketDialogProps) {
  const commonT = useTranslations('common');
  const pocketsT = useTranslations('pockets');
  const pocketDetailT = useTranslations('pages.pocketDetail');
  const sourcesT = useTranslations('sources');

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      as="div"
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <DialogBackdrop className="fixed inset-0 bg-black opacity-30" />

        <span className="inline-block h-screen align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <Dialog.Title
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900"
          >
            {pocketDetailT('editPocket')}
          </Dialog.Title>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="pocket-name"
                className="block text-sm font-medium text-gray-700"
              >
                {pocketsT('labels.nameField')}
              </label>
              <input
                type="text"
                id="pocket-name"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={pocketName}
                onChange={(e) => setPocketName(e.target.value)}
                placeholder={pocketsT('placeholders.nameField')}
              />
            </div>

            <div>
              <label
                htmlFor="pocket-description"
                className="block text-sm font-medium text-gray-700"
              >
                {pocketsT('labels.descriptionField')}
              </label>
              <textarea
                id="pocket-description"
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={pocketDescription}
                onChange={(e) => setPocketDescription(e.target.value)}
                placeholder={pocketsT('placeholders.descriptionField')}
              />
            </div>

            <div>
              <label
                htmlFor="pocket-tags"
                className="block text-sm font-medium text-gray-700"
              >
                {pocketsT('labels.tagsField')}
              </label>
              <input
                type="text"
                id="pocket-tags"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={pocketTags}
                onChange={(e) => setPocketTags(e.target.value)}
                placeholder={pocketsT('placeholders.tagsField')}
              />
              <p className="mt-1 text-sm text-gray-500">
                {pocketsT('hints.tags')}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-between space-x-3">
            <Button text={sourcesT('labels.modifySources')} onClick={onClose} />
            <div className="flex space-x-3">
              <Button text={commonT('buttons.cancel')} onClick={onClose} />
              <Button
                text={commonT('buttons.save')}
                onClick={() => {
                  onSave();
                  onClose();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
