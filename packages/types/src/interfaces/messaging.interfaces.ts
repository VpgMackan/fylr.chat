export interface MessagingPayload {
  routingKey: string;
  eventName: string;
  payload: any;
}
