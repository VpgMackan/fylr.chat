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
  subscribe: (routingKey: string) => void;
  unsubscribe: (routingKey: string) => void;
  addGlobalCallback: (
    callback: (routingKey: string, payload: any) => void,
  ) => void;
  removeGlobalCallback: (
    callback: (routingKey: string, payload: any) => void,
  ) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

type EventListener = (payload: any) => void;
type GlobalEventListener = (routingKey: string, payload: any) => void;

export const EventsProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const listenersRef = useRef<Map<string, Set<EventListener>>>(new Map());
  const globalListenersRef = useRef<Set<GlobalEventListener>>(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      const connectSocket = async () => {
        if (socketRef.current) return;

        try {
          console.log('Fetching WebSocket token...');
          const { token } = await getEventsWsToken();
          console.log('WebSocket token received, connecting...');

          const socket = io('http://localhost:3001/', {
            auth: { token },
          });
          socketRef.current = socket;

          socket.on('connect', () => {
            console.log('Events WebSocket connected:', socket.id);
            setIsConnected(true);
          });

          socket.on('disconnect', () => {
            console.log('Events WebSocket disconnected.');
            setIsConnected(false);
          });

          socket.onAny((routingKey, payload) => {
            console.log(routingKey, payload);
            const listeners = listenersRef.current.get(routingKey);
            if (listeners) {
              listeners.forEach((callback) => callback(payload));
            }
            globalListenersRef.current.forEach((callback) =>
              callback(routingKey, payload),
            );
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
        console.log('Disconnecting Events WebSocket.');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated]);

  const subscribe = useCallback((routingKey: string) => {
    if (!listenersRef.current.has(routingKey)) {
      listenersRef.current.set(routingKey, new Set());
    }
    socketRef.current?.emit('subscribe', routingKey);
  }, []);

  const unsubscribe = useCallback((routingKey: string) => {
    listenersRef.current.delete(routingKey);
    socketRef.current?.emit('unsubscribe', routingKey);
  }, []);

  const addGlobalCallback = useCallback((callback: GlobalEventListener) => {
    globalListenersRef.current.add(callback);
  }, []);

  const removeGlobalCallback = useCallback((callback: GlobalEventListener) => {
    globalListenersRef.current.delete(callback);
  }, []);

  const value = {
    isConnected,
    subscribe,
    unsubscribe,
    addGlobalCallback,
    removeGlobalCallback,
  };

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
