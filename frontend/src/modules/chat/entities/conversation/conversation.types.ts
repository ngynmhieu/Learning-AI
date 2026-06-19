/** A chat thread as the UI knows it (sidebar list item). */
export interface Conversation {
  id: string;
  title: string;
  /** Last-activity time in ms — used to sort newest-first. */
  updatedAt: number;
}
