'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import {
  ActiveSession,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
} from '@/services/api/auth.api';

function SessionItem({
  session,
  isCurrent,
  onRevoke,
}: {
  session: ActiveSession;
  isCurrent: boolean;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-4">
        <Icon icon="lucide:laptop" className="w-8 h-8 text-gray-500" />
        <div>
          <p className="font-semibold text-gray-800">
            Unknown Device
            {isCurrent && (
              <span className="ml-2 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Current session
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            Last active:{' '}
            {new Date(session.updatedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
      </div>
      {!isCurrent && (
        <button
          onClick={() => onRevoke(session.id)}
          className="text-sm font-medium text-red-600 hover:text-red-800"
        >
          Log out
        </button>
      )}
    </div>
  );
}

export default function SessionsManager() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const data = await getActiveSessions();
      setSessions(data);
    } catch (error) {
      toast.error('Failed to load active sessions.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      toast.success('Session logged out.');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      toast.error('Failed to log out session.');
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      await revokeAllOtherSessions();
      toast.success('Logged out all other sessions.');
      await fetchSessions();
    } catch (error) {
      toast.error('Failed to log out other sessions.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg"></div>
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {sessions.map((session, index) => (
          <SessionItem
            key={session.id}
            session={session}
            isCurrent={index === 0}
            onRevoke={handleRevoke}
          />
        ))}
      </div>
      {sessions.length > 1 && (
        <div className="pt-4 border-t">
          <button
            onClick={handleRevokeAllOthers}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Log out of all other devices
          </button>
        </div>
      )}
    </div>
  );
}
