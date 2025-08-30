import { useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getConversationWsToken } from '@/services/api/chat.api';
import {
  MessageApiResponse,
  WsServerEventPayload,
  MessageAndSourceApiResponse,
  SourceApiResponseWithIsActive,
} from '@fylr/types';

const STREAMING_ASSISTANT_ID = 'streaming-assistant-msg';

type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';
interface ChatState {
  messages: MessageApiResponse[];
  sources: SourceApiResponseWithIsActive[];
  connectionStatus: ConnectionStatus;
  status: { stage: string; message: string } | null;
}

type ChatAction =
  | { type: 'SET_CONNECTED'; payload: ConnectionStatus }
  | { type: 'SET_HISTORY'; payload: MessageApiResponse[] }
  | { type: 'SET_STATUS'; payload: { stage: string; message: string } | null }
  | { type: 'ADD_MESSAGE'; payload: MessageApiResponse }
  | {
      type: 'APPEND_CHUNK';
      payload: { content: string; conversationId: string };
    }
  | { type: 'FINALIZE_ASSISTANT_MESSAGE'; payload: MessageApiResponse }
  | { type: 'DELETE_MESSAGE'; payload: { messageId: string } }
  | { type: 'UPDATE_MESSAGE'; payload: MessageApiResponse }
  | { type: 'SET_SOURCES'; payload: SourceApiResponseWithIsActive[] };

const initialState: ChatState = {
  messages: [],
  sources: [],
  connectionStatus: 'idle',
  status: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connectionStatus: action.payload };
    case 'SET_HISTORY':
      return { ...state, messages: action.payload };
    case 'SET_SOURCES':
      return { ...state, sources: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'APPEND_CHUNK':
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg?.id === STREAMING_ASSISTANT_ID) {
        const updatedMsg = {
          ...lastMsg,
          content: lastMsg.content + action.payload.content,
        };
        return {
          ...state,
          messages: [...state.messages.slice(0, -1), updatedMsg],
        };
      } else {
        const newStreamingMsg: MessageApiResponse = {
          id: STREAMING_ASSISTANT_ID,
          conversationId: action.payload.conversationId,
          role: 'assistant',
          content: action.payload.content,
          createdAt: new Date().toISOString(),
          metadata: {},
        };
        return { ...state, messages: [...state.messages, newStreamingMsg] };
      }
    case 'FINALIZE_ASSISTANT_MESSAGE':
      return {
        ...state,
        status: null,
        messages: [
          ...state.messages.filter((m) => m.id !== STREAMING_ASSISTANT_ID),
          action.payload,
        ],
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(
          (m) => m.id !== action.payload.messageId,
        ),
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        ),
      };
    default:
      return state;
  }
}

export function useChat(chatId: string | null) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!chatId) return;

    const connectSocket = async () => {
      try {
        const { token } = await getConversationWsToken(chatId);
        const socket = io('http://localhost:3001/chat', { auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => {
          dispatch({ type: 'SET_CONNECTED', payload: 'connected' });
          socket.emit('conversationAction', {
            action: 'join',
            conversationId: chatId,
          });
        });

        socket.on('disconnect', () =>
          dispatch({ type: 'SET_CONNECTED', payload: 'reconnecting' }),
        );
        socket.on(
          'conversationHistory',
          (history: MessageAndSourceApiResponse) => {
            dispatch({ type: 'SET_HISTORY', payload: history.messages });
            dispatch({ type: 'SET_SOURCES', payload: history.sources });
          },
        );

        socket.on(
          'sourcesUpdated',
          (sources: SourceApiResponseWithIsActive[]) => {
            dispatch({ type: 'SET_SOURCES', payload: sources });
          },
        );

        socket.on(
          'conversationAction',
          (event: WsServerEventPayload & { data: any }) => {
            const { action, data, conversationId: eventConvId } = event;
            if (eventConvId !== chatId) return;

            switch (action) {
              case 'statusUpdate':
                dispatch({ type: 'SET_STATUS', payload: data });
                break;
              case 'newMessage':
                dispatch({ type: 'ADD_MESSAGE', payload: data });
                break;
              case 'messageChunk':
                dispatch({
                  type: 'APPEND_CHUNK',
                  payload: { ...data, conversationId: chatId },
                });
                break;

              case 'messageEnd':
                dispatch({ type: 'FINALIZE_ASSISTANT_MESSAGE', payload: data });
                break;

              case 'streamError':
                dispatch({ type: 'SET_STATUS', payload: null });
                console.error('AI Stream Error:', data.message);
                break;

              case 'messageDeleted':
                dispatch({ type: 'DELETE_MESSAGE', payload: data });
                break;

              case 'messageUpdated':
                dispatch({ type: 'UPDATE_MESSAGE', payload: data });
                break;

              default:
                break;
            }
          },
        );
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
      }
    };

    void connectSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [chatId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (socketRef.current && chatId && content.trim()) {
        socketRef.current.emit('conversationAction', {
          action: 'sendMessage',
          conversationId: chatId,
          content,
        });
      }
    },
    [chatId],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (socketRef.current && chatId) {
        socketRef.current.emit('conversationAction', {
          action: 'deleteMessage',
          conversationId: chatId,
          messageId,
        });
      }
    },
    [chatId],
  );

  const updateMessage = useCallback(
    (messageId: string, content: string) => {
      if (socketRef.current && chatId && content.trim()) {
        socketRef.current.emit('conversationAction', {
          action: 'updateMessage',
          conversationId: chatId,
          messageId,
          content,
        });
      }
    },
    [chatId],
  );

  const updateSources = useCallback(
    (sourcesId: string[]) => {
      if (socketRef.current && chatId) {
        socketRef.current.emit('conversationAction', {
          action: 'updateSources',
          conversationId: chatId,
          sourcesId,
        });
      }
    },
    [chatId],
  );

  const regenerateMessage = useCallback(
    (messageId: string) => {
      if (socketRef.current && chatId) {
        socketRef.current.emit('conversationAction', {
          action: 'regenerateMessage',
          conversationId: chatId,
          messageId,
        });
      }
    },
    [chatId],
  );

  return {
    messages: state.messages,
    sources: state.sources,
    connectionStatus: state.connectionStatus,
    status: state.status,
    sendMessage,
    deleteMessage,
    updateMessage,
    updateSources,
    regenerateMessage,
  };
}
