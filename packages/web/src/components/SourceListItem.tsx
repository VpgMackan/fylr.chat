import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Icon } from '@iconify/react';

import { useSubscription } from '@/hooks/useEvents';
import { SourceApiResponse } from '@fylr/types';

interface StatusPayload {
  stage: string;
  message: string;
  error?: boolean;
}

const StatusIndicator = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { icon: string; color: string; spin?: boolean }> = {
    QUEUED: { icon: 'mdi:clock-outline', color: 'text-gray-500' },
    STARTING: { icon: 'mdi:dots-circle', color: 'text-blue-500', spin: true },
    FETCHING: { icon: 'mdi:cloud-download-outline', color: 'text-blue-500', spin: true },
    PARSING: { icon: 'mdi:file-document-edit-outline', color: 'text-blue-500', spin: true },
    VECTORIZING: { icon: 'mdi:atom-variant', color: 'text-purple-500', spin: true },
    COMPLETED: { icon: 'mdi:check-circle', color: 'text-green-500' },
    FAILED: { icon: 'mdi:alert-circle', color: 'text-red-500' },
  };

  const config = statusConfig[status] || statusConfig.QUEUED;

  return (
    <Icon
      icon={config.icon}
      className={`${config.color} ${config.spin ? 'animate-spin' : ''}`}
    />
  );
};

export default function Source({ source }: { source: SourceApiResponse }) {
  const { name, size, uploadTime, id, pocketId, jobKey } = source;
  
  const [currentStatus, setCurrentStatus] = useState(source.status);
  const [statusMessage, setStatusMessage] = useState(source.status);
  
  const router = useRouter();
  const common = useTranslations('common');
  
  const routingKey = jobKey ? `job.${jobKey}.status` : null;

  useSubscription(routingKey, (data: { payload: StatusPayload }) => {
    const { stage, message, error } = data.payload;
    setCurrentStatus(stage);
    setStatusMessage(message);

    if (stage === 'COMPLETED') {
      toast.success(`'${name}' has been processed successfully!`);
    } else if (stage === 'FAILED' || error) {
      toast.error(`Processing failed for '${name}': ${message}`);
    }
  });

  const handleClick = () => {
    if (currentStatus === 'COMPLETED') {
        router.push(`/pocket/${pocketId}/source/${id}`);
    } else {
        toast('Please wait until the file has been processed.');
    }
  };

  const isProcessing = !['COMPLETED', 'FAILED'].includes(currentStatus);
  const formattedSize = (parseInt(size, 10) / 1024).toFixed(2);

  return (
    <button
      className="w-full bg-transparent text-left border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between disabled:opacity-70 disabled:cursor-not-allowed"
      onClick={handleClick}
      disabled={isProcessing}
    >
      <div>
        <div className="flex justify-between items-start">
            <p className="font-semibold pr-2">{name}</p>
            <StatusIndicator status={currentStatus} />
        </div>
        <p className={`text-sm mb-2 ${isProcessing ? 'text-blue-600 animate-pulse' : 'text-gray-500'}`}>
            {statusMessage}
        </p>
      </div>

      <div>
        <hr />
        <p className="text-xs mt-2">
          {common('metadata.size', { size: `${formattedSize} KB` })}
        </p>
        <p className="text-xs">
          {common('metadata.imported', { date: new Date(uploadTime).toLocaleDateString() })}
        </p>
      </div>
    </button>
  );
}