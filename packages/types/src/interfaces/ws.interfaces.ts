import { MessageApiResponse } from './api.interfaces';

export interface WsSendMessagePayload {
  action: 'sendMessage';
  conversationId: string;
  content: string;
  agenticMode?: boolean;
}

export interface WsDeleteMessagePayload {
  action: 'deleteMessage';
  conversationId: string;
  messageId: string;
}

export interface WsUpdateMessagePayload {
  action: 'updateMessage';
  conversationId: string;
  messageId: string;
  content: string;
}

export interface WsRegenerateMessagePayload {
  action: 'regenerateMessage';
  conversationId: string;
  messageId: string;
}

export interface WsJoinConversationPayload {
  action: 'join';
  conversationId: string;
}

export interface WsUpdateSourcesPayload {
  action: 'updateSources';
  conversationId: string;
  sourcesId: string[];
}

export type WsClientActionPayload =
  | WsSendMessagePayload
  | WsJoinConversationPayload
  | WsDeleteMessagePayload
  | WsUpdateMessagePayload
  | WsUpdateSourcesPayload
  | WsRegenerateMessagePayload;

export interface WsNewMessageEvent {
  action: 'newMessage';
  conversationId: string;
  data: MessageApiResponse;
}

export interface WsMessageChunkEvent {
  action: 'messageChunk';
  conversationId: string;
  data: {
    content: string;
    chunkIndex: number;
    streamId: string;
  };
}

export interface WsMessageEndEvent {
  action: 'messageEnd';
  conversationId: string;
  data: MessageApiResponse;
}

export interface WsStreamErrorEvent {
  action: 'streamError';
  conversationId: string;
  data: { message: string };
}

export interface WsMessageDeletedEvent {
  action: 'messageDeleted';
  conversationId: string;
  data: { messageId: string };
}

export interface WsMessageUpdatedEvent {
  action: 'messageUpdated';
  conversationId: string;
  data: MessageApiResponse;
}

export interface WsStatusUpdateEvent {
  action: 'statusUpdate';
  conversationId: string;
  data: { stage: string; message: string };
}

export interface WsAgentThoughtEvent {
  action: 'agentThought';
  conversationId: string;
  data: MessageApiResponse;
}

export interface WsToolProgressEvent {
  action: 'toolProgress';
  conversationId: string;
  data: { toolName: string; message: string };
}

export type WsServerEventPayload =
  | WsNewMessageEvent
  | WsMessageChunkEvent
  | WsMessageEndEvent
  | WsStreamErrorEvent
  | WsMessageDeletedEvent
  | WsMessageUpdatedEvent
  | WsStatusUpdateEvent
  | WsAgentThoughtEvent
  | WsToolProgressEvent;
