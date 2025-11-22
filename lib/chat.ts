/**
 * Chat message types and utilities
 */

export interface EncryptedMessage {
  encrypted: string;
  iv: string;
  encryptedKey: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "me" | "other";
  timestamp: number;
  encrypted?: boolean;
}

export interface KeyExchange {
  publicKey: string;
  timestamp: number;
}

