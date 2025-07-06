import { MessageApiResponse } from "./api.interfaces";

export interface WsSendMessagePayload {
  action: "sendMessage";
  conversationId: string;
  content: string;
}

export interface WsDeleteMessagePayload {
  action: "deleteMessage";
  conversationId: string;
  messageId: string;
}

export interface WsUpdateMessagePayload {
  action: "updateMessage";
  conversationId: string;
  messageId: string;
  content: string;
}

export interface WsRegenerateMessagePayload {
  action: "regenerateMessage";
  conversationId: string;
  messageId: string;
}

export interface WsJoinConversationPayload {
  action: "join";
  conversationId: string;
}

export type WsClientActionPayload =
  | WsSendMessagePayload
  | WsJoinConversationPayload
  | WsDeleteMessagePayload
  | WsUpdateMessagePayload
  | WsRegenerateMessagePayload;

export interface WsNewMessageEvent {
  action: "newMessage";
  conversationId: string;
  data: MessageApiResponse;
}

export interface WsMessageChunkEvent {
  action: "messageChunk";
  conversationId: string;
  data: { content: string };
}

export interface WsMessageEndEvent {
  action: "messageEnd";
  conversationId: string;
  data: MessageApiResponse;
}

export interface WsStreamErrorEvent {
  action: "streamError";
  conversationId: string;
  data: { message: string };
}

export interface WsMessageDeletedEvent {
  action: "messageDeleted";
  conversationId: string;
  data: { messageId: string };
}

export interface WsMessageUpdatedEvent {
  action: "messageUpdated";
  conversationId: string;
  data: MessageApiResponse;
}

export interface WsStatusUpdateEvent {
  action: "statusUpdate";
  conversationId: string;
  data: { stage: string; message: string };
}

export type WsServerEventPayload =
  | WsNewMessageEvent
  | WsMessageChunkEvent
  | WsMessageEndEvent
  | WsStreamErrorEvent
  | WsMessageDeletedEvent
  | WsMessageUpdatedEvent
  | WsStatusUpdateEvent;
