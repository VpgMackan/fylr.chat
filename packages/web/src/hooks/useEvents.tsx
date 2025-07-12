// packages/web/src/hooks/useEvents.ts
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getEventsWsToken } from '@/services/api/auth.api';

interface EventsContextType {
  isConnected: boolean;
  // The 'topic' is the RabbitMQ routing key, e.g., 'job.xyz.status'
  // The 'eventName' is the event the server will emit back to the client, e.g., 'jobStatusUpdate'
  subscribe: (
    topic: string,
    eventName: string,
    callback: (payload: any) => void,
  ) => void;
  unsubscribe: (
    topic: string,
    eventName: string,
    callback: (payload: any) => void,
  ) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

type EventListener = (payload: any) => void;

export const EventsProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventListener>>>(new Map());

  useEffect(() => {
    if (isAuthenticated) {
      const connectSocket = async () => {
        if (socketRef.current) return;

        try {
          const { token } = await getEventsWsToken();
          const socket = io('http://localhost:3001/', { auth: { token } });
          socketRef.current = socket;

          socket.on('connect', () => {
            setIsConnected(true);
          });

          socket.on('disconnect', () => {
            setIsConnected(false);
          });

          // This remains our generic handler for all incoming events
          socket.onAny((eventName, payload) => {
            const listeners = listenersRef.current.get(eventName);
            if (listeners) {
              listeners.forEach((callback) => callback(payload));
            }
          });
        } catch (error) {
          console.error(
            'Failed to establish events WebSocket connection:',
            error,
          );
        }
      };

      connectSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated]);

  const subscribe = useCallback(
    (topic: string, eventName: string, callback: EventListener) => {
      // 1. Tell the server we are interested in this topic
      socketRef.current?.emit('subscribe', topic);

      // 2. Register the local callback for the event name
      if (!listenersRef.current.has(eventName)) {
        listenersRef.current.set(eventName, new Set());
      }
      listenersRef.current.get(eventName)?.add(callback);
    },
    [],
  );

  const unsubscribe = useCallback(
    (topic: string, eventName: string, callback: EventListener) => {
      // 1. Tell the server we are no longer interested in this topic
      socketRef.current?.emit('unsubscribe', topic);

      // 2. Remove the local callback
      listenersRef.current.get(eventName)?.delete(callback);
    },
    [],
  );

  const value = { isConnected, subscribe, unsubscribe };

  return (
    <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
  );
};

export const useEvents = (): EventsContextType => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};
