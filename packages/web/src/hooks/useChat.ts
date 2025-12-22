import { useReducer, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  getConversationWsToken,
  initiateConversation as apiInitiateConversation,
} from '@/services/api/chat.api';
import {
  MessageApiResponse,
  WsServerEventPayload,
  MessageAndSourceApiResponse,
  SourceApiResponseWithIsActive,
} from '@fylr/types';
import { toast } from 'react-hot-toast';

const STREAMING_ASSISTANT_ID = 'streaming-assistant-msg';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

interface MessageWithThought extends MessageApiResponse {
  agentThoughts?: MessageApiResponse[];
}

interface StreamingState {
  streamId: string | null;
  expectedChunkIndex: number;
  receivedChunks: Set<number>;
  content: string;
}

interface ChatState {
  messages: MessageWithThought[];
  sources: SourceApiResponseWithIsActive[];
  name: string;
  connectionStatus: ConnectionStatus;
  status: { stage: string; message: string } | null;
  toolProgress: { toolName: string; message: string } | null;
  currentThoughts: MessageApiResponse[];
  streamingState: StreamingState;
  metadata: any;
}

type ChatAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_HISTORY'; payload: MessageApiResponse[] }
  | { type: 'SET_STATUS'; payload: { stage: string; message: string } | null }
  | {
      type: 'SET_TOOL_PROGRESS';
      payload: { toolName: string; message: string } | null;
    }
  | { type: 'ADD_AGENT_THOUGHT'; payload: MessageApiResponse }
  | { type: 'ADD_MESSAGE'; payload: MessageApiResponse }
  | {
      type: 'APPEND_CHUNK';
      payload: {
        content: string;
        conversationId: string;
        chunkIndex: number;
        streamId: string;
      };
    }
  | { type: 'FINALIZE_ASSISTANT_MESSAGE'; payload: MessageApiResponse }
  | { type: 'DELETE_MESSAGE'; payload: { messageId: string } }
  | { type: 'UPDATE_MESSAGE'; payload: MessageApiResponse }
  | { type: 'SET_SOURCES'; payload: SourceApiResponseWithIsActive[] }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_METADATA'; payload: any }
  | { type: 'RESET_STREAMING_STATE' };

const initialState: ChatState = {
  messages: [],
  sources: [],
  name: '',
  connectionStatus: 'connecting',
  status: null,
  toolProgress: null,
  currentThoughts: [],
  metadata: {},
  streamingState: {
    streamId: null,
    expectedChunkIndex: 0,
    receivedChunks: new Set(),
    content: '',
  },
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'SET_HISTORY':
      return { ...state, messages: action.payload };
    case 'SET_SOURCES':
      return { ...state, sources: action.payload };
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_METADATA':
      return { ...state, metadata: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_TOOL_PROGRESS':
      return { ...state, toolProgress: action.payload };
    case 'ADD_AGENT_THOUGHT':
      // Prevent duplicate thoughts by checking if this thought ID already exists
      if (state.currentThoughts.some((t) => t.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        currentThoughts: [...state.currentThoughts, action.payload],
      };
    case 'ADD_MESSAGE':
      if (state.messages.some((m) => m.id === action.payload.id)) {
        return state;
      }
      // Clear current thoughts when a new user message is added
      const shouldClearThoughts = action.payload.role === 'user';
      return {
        ...state,
        messages: [...state.messages, action.payload],
        currentThoughts: shouldClearThoughts ? [] : state.currentThoughts,
      };
    case 'APPEND_CHUNK': {
      const { content, chunkIndex, streamId } = action.payload;

      // Initialize or reset streaming state for new stream
      let currentStreamingState = state.streamingState;
      if (state.streamingState.streamId !== streamId) {
        console.log(`🆕 New stream started: ${streamId}`);
        currentStreamingState = {
          streamId,
          expectedChunkIndex: 0,
          receivedChunks: new Set(),
          content: '',
        };
      }

      // Check for duplicate chunks
      if (currentStreamingState.receivedChunks.has(chunkIndex)) {
        console.log(
          `⚠️ Duplicate chunk ${chunkIndex} ignored for stream ${streamId}`,
        );
        return state;
      }

      // Check for out-of-order chunks (optional: you could buffer them)
      if (chunkIndex !== currentStreamingState.expectedChunkIndex) {
        console.warn(
          `⚠️ Out-of-order chunk: expected ${currentStreamingState.expectedChunkIndex}, got ${chunkIndex}`,
        );
        // For now, we'll still process it but log the warning
      }

      // Update streaming state
      const newReceivedChunks = new Set(currentStreamingState.receivedChunks);
      newReceivedChunks.add(chunkIndex);
      const newContent = currentStreamingState.content + content;

      console.log(`✅ Chunk ${chunkIndex} processed (${content.length} chars)`);

      // Update or create the streaming message
      const streamingMsgIndex = state.messages.findIndex(
        (m) => m.id === STREAMING_ASSISTANT_ID,
      );

      const newStreamingState = {
        streamId,
        expectedChunkIndex: chunkIndex + 1,
        receivedChunks: newReceivedChunks,
        content: newContent,
      };

      if (streamingMsgIndex > -1) {
        const newMessages = [...state.messages];
        newMessages[streamingMsgIndex] = {
          ...newMessages[streamingMsgIndex],
          content: newContent,
        };
        return {
          ...state,
          messages: newMessages,
          streamingState: newStreamingState,
        };
      } else {
        const newStreamingMsg: MessageApiResponse = {
          id: STREAMING_ASSISTANT_ID,
          conversationId: action.payload.conversationId,
          role: 'assistant',
          content: newContent,
          createdAt: new Date().toISOString(),
          metadata: {},
          reasoning: null,
          toolCalls: null,
          toolCallId: null,
        };
        return {
          ...state,
          messages: [...state.messages, newStreamingMsg],
          streamingState: newStreamingState,
        };
      }
    }
    case 'FINALIZE_ASSISTANT_MESSAGE': {
      const finalMsg = action.payload as MessageWithThought;
      // Attach collected thoughts to the final message
      finalMsg.agentThoughts = state.currentThoughts;

      const newMessages = state.messages.map((m) =>
        m.id === STREAMING_ASSISTANT_ID ? finalMsg : m,
      );
      if (!newMessages.some((m) => m.id === finalMsg.id)) {
        newMessages.push(finalMsg);
      }
      return {
        ...state,
        status: null,
        toolProgress: null, // Clear tool progress when message finalizes
        messages: newMessages,
        currentThoughts: [], // Clear thoughts after attaching to message
        streamingState: {
          streamId: null,
          expectedChunkIndex: 0,
          receivedChunks: new Set(),
          content: '',
        },
      };
    }
    case 'RESET_STREAMING_STATE':
      return {
        ...state,
        streamingState: {
          streamId: null,
          expectedChunkIndex: 0,
          receivedChunks: new Set(),
          content: '',
        },
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
    let isActive = true;

    // Clean up any existing connection first
    if (socketRef.current) {
      console.log('🧹 Cleaning up existing socket connection');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const connectSocket = async () => {
      try {
        console.log(`🔌 Initiating socket connection for chat ${chatId}`);

        const { token } = await getConversationWsToken(chatId);

        if (!isActive) {
          console.log('⚠️ Connection aborted - component unmounted');
          return;
        }

        const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
          auth: { token },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('🔌 Socket connected, joining room...');
          socket.emit('conversationAction', {
            action: 'join',
            conversationId: chatId,
          });
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'reconnecting' });
        });

        socket.on('connect_error', () =>
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' }),
        );

        socket.on('reconnect_failed', () =>
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' }),
        );

        socket.on(
          'conversationHistory',
          (history: MessageAndSourceApiResponse) => {
            dispatch({ type: 'SET_HISTORY', payload: history.messages });
            dispatch({ type: 'SET_SOURCES', payload: history.sources });
            dispatch({ type: 'SET_NAME', payload: history.name });
            dispatch({ type: 'SET_METADATA', payload: history.metadata || {} });
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
          },
        );

        socket.on('forceRAGMode', ({ reason }: { reason: string }) => {
          console.log('Backend forced RAG mode:', reason);
          toast(reason, {
            icon: '🔒',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
        });

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
              case 'toolProgress':
                dispatch({ type: 'SET_TOOL_PROGRESS', payload: data });
                break;
              case 'agentThought':
                dispatch({ type: 'ADD_AGENT_THOUGHT', payload: data });
                break;
              case 'newMessage':
                dispatch({ type: 'ADD_MESSAGE', payload: data });
                break;
              case 'messageChunk':
                console.log(
                  `📦 Chunk received [index: ${data.chunkIndex}]:`,
                  data.content,
                );
                dispatch({
                  type: 'APPEND_CHUNK',
                  payload: {
                    content: data.content,
                    conversationId: chatId,
                    chunkIndex: data.chunkIndex,
                    streamId: data.streamId,
                  },
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
      console.log('🧹 Cleanup: Disconnecting socket');
      isActive = false;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [chatId]);

  const sendMessage = useCallback(
    (payload: {
      content: string;
      agentMode: string;
      sourceIds?: string[];
      libraryIds?: string[];
      webSearchEnabled?: boolean;
    }) => {
      if (socketRef.current && chatId && payload.content.trim()) {
        console.log(
          '📤 Sending message with agentMode:',
          payload.agentMode,
          'webSearchEnabled:',
          payload.webSearchEnabled,
        );
        socketRef.current.emit('conversationAction', {
          action: 'sendMessage',
          conversationId: chatId,
          content: payload.content,
          sourceIds: payload.sourceIds,
          libraryIds: payload.libraryIds,
          agentMode: payload.agentMode,
          webSearchEnabled: payload.webSearchEnabled,
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
          payload: { sourcesId },
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
          payload: { messageId },
        });
      }
    },
    [chatId],
  );

  const retryConnection = useCallback(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
    socketRef.current?.connect();
  }, [socketRef]);

  const initiateAndSendMessage = useCallback(
    async (payload: {
      content: string;
      agentMode: string;
      sourceIds?: string[];
      libraryIds?: string[];
      webSearchEnabled?: boolean;
    }) => {
      if (chatId) {
        sendMessage(payload);
        return null;
      }

      try {
        console.log(
          '🚀 Initiating conversation with agentMode:',
          payload.agentMode,
          'webSearchEnabled:',
          payload.webSearchEnabled,
        );
        const newConversation: any = await apiInitiateConversation(
          payload.content,
          payload.agentMode,
          payload.sourceIds,
          payload.libraryIds,
          payload.webSearchEnabled,
        );
        return newConversation;
      } catch (error) {
        console.error('Failed to initiate conversation', error);
        return null;
      }
    },
    [chatId, sendMessage],
  );

  return {
    messages: state.messages,
    sources: state.sources,
    name: state.name,
    connectionStatus: state.connectionStatus,
    status: state.status,
    toolProgress: state.toolProgress,
    currentThoughts: state.currentThoughts,
    agentMode: state.metadata?.agentMode,
    sendMessage,
    initiateAndSendMessage,
    deleteMessage,
    updateMessage,
    updateSources,
    regenerateMessage,
    retryConnection,
  };
}
