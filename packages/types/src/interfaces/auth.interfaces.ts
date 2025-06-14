export interface UserPayload {
  id: string;
  name: string;
  email: string;
}

export interface ChatTokenPayload extends UserPayload {
  conversationId: string;
}
