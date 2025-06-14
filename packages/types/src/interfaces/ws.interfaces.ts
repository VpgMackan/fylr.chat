import { MessageApiResponse } from "./api.interfaces";

export interface WsSendMessagePayload {
  action: "sendMessage";
  conversationId: string;
  content: string;
}

export interface WsJoinConversationPayload {
  action: "join";
  conversationId: string;
}

export type WsClientActionPayload =
  | WsSendMessagePayload
  | WsJoinConversationPayload;

export interface WsNewMessageEvent {
  action: "newMessage";
  data: MessageApiResponse;
}

export interface WsMessageChunkEvent {
  action: "messageChunk";
  data: { content: string };
}

export interface WsMessageEndEvent {
  action: "messageEnd";
  data: MessageApiResponse;
}

export interface WsStreamErrorEvent {
  action: "streamError";
  data: { message: string };
}

export type WsServerEventPayload =
  | WsNewMessageEvent
  | WsMessageChunkEvent
  | WsMessageEndEvent
  | WsStreamErrorEvent;
