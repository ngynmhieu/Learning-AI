export type Role = "user" | "assistant";
export type MessageStatus = "complete" | "streaming" | "error";

export interface Message {
  id: string;
  role: Role;
  content: string;
  thinking?: string;
  status: MessageStatus;
  createdAt: number;
}
