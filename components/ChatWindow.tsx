"use client";

import { useState, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import KeyShare from "./KeyShare";
import {
  generateRSAKeyPair,
  exportPublicKey,
  importPublicKey,
  generateAESKey,
  encryptAESKeyWithRSA,
  decryptAESKeyWithRSA,
  encryptMessage,
  decryptMessage,
} from "@/lib/crypto";
import { ChatMessage as ChatMessageType, EncryptedMessage } from "@/lib/chat";

// Generate a persistent user ID
function getUserId(): string {
  if (typeof window === "undefined") return "";
  let userId = localStorage.getItem("chatUserId");
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("chatUserId", userId);
  }
  return userId;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [status, setStatus] = useState("Initializing encryption...");
  const [myPublicKey, setMyPublicKey] = useState<string | null>(null);
  const [otherPublicKey, setOtherPublicKey] = useState<string | null>(null);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [myKeyPair, setMyKeyPair] = useState<CryptoKeyPair | null>(null);
  const [userId] = useState<string>(() => getUserId());
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const keyEstablishedTimestampRef = useRef<number | null>(null);

  // Check for public key in URL query parameters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const keyFromUrl = params.get("key");
    if (keyFromUrl && !otherPublicKey) {
      // Decode the key from URL
      try {
        const decodedKey = decodeURIComponent(keyFromUrl);
        handleReceivePublicKey(decodedKey, `user-${Date.now()}`);
      } catch (error) {
        console.error("Failed to parse key from URL:", error);
      }
    }
  }, []);

  // Initialize encryption keys and register with server
  useEffect(() => {
    async function initialize() {
      try {
        setStatus("Generating RSA key pair...");
        const keyPair = await generateRSAKeyPair();
        setMyKeyPair(keyPair);
        const publicKeyStr = await exportPublicKey(keyPair.publicKey);
        setMyPublicKey(publicKeyStr);

        // Register public key with server
        try {
          const response = await fetch("/api/keys", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": userId,
            },
            body: JSON.stringify({ publicKey: publicKeyStr }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Failed to register key:", response.statusText, errorData);
            setStatus("Failed to register with server. Please refresh.");
          } else {
            const result = await response.json();
            console.log("[Client] Public key registered:", { userId: result.userId || userId });
          }
        } catch (error) {
          console.error("Failed to register key:", error);
          setStatus("Failed to connect to server. Please check your connection.");
        }

        setStatus("Ready - Share your public key or wait for connection...");
        setIsInitializing(false);
      } catch (error) {
        console.error("Failed to initialize encryption:", error);
        setStatus("Failed to initialize encryption");
      }
    }
    initialize();
  }, [userId]);

  // Poll for other users' public keys and encrypted AES keys
  useEffect(() => {
    if (!myPublicKey || !myKeyPair) return;

    let pollCount = 0;
    const pollForKeys = async () => {
      try {
        pollCount++;
        const response = await fetch("/api/keys", {
          headers: {
            "x-user-id": userId,
          },
        });
        
        if (!response.ok) {
          console.error("Failed to fetch keys:", response.status, response.statusText);
          return;
        }

        const data = await response.json();
        console.log("[Client] Keys poll response:", { 
          pollCount, 
          hasEncryptedAESKey: !!data.encryptedAESKey, 
          otherKeysCount: data.keys?.length || 0,
          hasAESKey: !!aesKey,
          hasOtherPublicKey: !!otherPublicKey
        });

        // Check for encrypted AES key first
        if (data.encryptedAESKey && !aesKey && myKeyPair) {
          try {
            setStatus("Decrypting shared key...");
            const decryptedAESKey = await decryptAESKeyWithRSA(
              data.encryptedAESKey,
              myKeyPair.privateKey
            );
            setAesKey(decryptedAESKey);
            keyEstablishedTimestampRef.current = Date.now();
            // Clear processed message IDs when a new key is established
            // to avoid issues with messages from previous sessions
            processedMessageIdsRef.current.clear();
            setStatus("Secure connection established - You can now send messages");
            console.log("[Client] AES key decrypted successfully");
          } catch (error) {
            console.error("Failed to decrypt AES key:", error);
            setStatus("Failed to decrypt shared key");
          }
        }

        // Check for other users' public keys
        if (data.keys && data.keys.length > 0 && !otherPublicKey) {
          const otherKeyData = data.keys[0];
          console.log("[Client] Found other user's public key:", { userId: otherKeyData.userId });
          // Only process if we don't already have a connection
          if (!aesKey) {
            setOtherUserId(otherKeyData.userId);
            await handleReceivePublicKey(otherKeyData.publicKey, otherKeyData.userId);
          }
        } else if (!otherPublicKey && pollCount > 5) {
          // After 5 polls (10 seconds), show helpful message
          setStatus("Waiting for another user... Share your public key or wait for connection");
        }
      } catch (error) {
        console.error("Error polling for keys:", error);
      }
    };

    // Poll every 2 seconds for keys
    const keyPollInterval = setInterval(pollForKeys, 2000);
    pollForKeys(); // Initial poll

    return () => clearInterval(keyPollInterval);
  }, [myPublicKey, myKeyPair, userId, otherPublicKey, aesKey]);

  // Poll for new messages
  useEffect(() => {
    if (!aesKey || !myKeyPair) {
      // Don't poll for messages if we don't have the AES key yet
      return;
    }

    const pollForMessages = async () => {
      try {
        const response = await fetch("/api/messages", {
          headers: {
            "x-user-id": userId,
          },
        });
        
        if (!response.ok) {
          console.error("Failed to fetch messages:", response.statusText);
          return;
        }

        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
          for (const msg of data.messages) {
            // Skip if we've already processed this message
            if (processedMessageIdsRef.current.has(msg.id)) {
              continue;
            }
            processedMessageIdsRef.current.add(msg.id);

            // Validate message structure
            if (!msg.encrypted || !msg.iv) {
              console.error("Invalid message structure:", msg);
              continue;
            }

            // Only try to decrypt if we have the AES key
            if (!aesKey) {
              console.warn("Received message but no AES key available yet. Skipping.");
              continue;
            }

            // Skip messages that were sent before the key was established
            // (they might be from a previous session or encrypted with a different key)
            // Allow a 10 second buffer to account for clock differences and network delays
            if (keyEstablishedTimestampRef.current) {
              const timeDiff = msg.timestamp - (keyEstablishedTimestampRef.current - 10000);
              if (timeDiff < 0) {
                console.warn("Skipping message sent before key establishment:", {
                  messageTimestamp: new Date(msg.timestamp).toISOString(),
                  keyEstablished: new Date(keyEstablishedTimestampRef.current).toISOString(),
                  timeDiffSeconds: Math.round(timeDiff / 1000),
                });
                continue;
              }
            }

            const encryptedMsg: EncryptedMessage = {
              encrypted: msg.encrypted,
              iv: msg.iv,
              encryptedKey: "",
              timestamp: msg.timestamp,
            };

            await handleReceiveMessage(encryptedMsg);
          }
        }
      } catch (error) {
        console.error("Error polling for messages:", error);
      }
    };

    // Poll every 1 second for messages
    pollingIntervalRef.current = setInterval(pollForMessages, 1000);
    pollForMessages(); // Initial poll

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [aesKey, myKeyPair, userId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle receiving other user's public key (manual input or from server)
  const handleReceivePublicKey = async (publicKeyStr: string, targetUserId?: string) => {
    // If we already have a connection, don't override it
    if (aesKey && otherPublicKey) {
      return;
    }

    try {
      setStatus("Establishing secure connection...");
      const otherKey = await importPublicKey(publicKeyStr);
      setOtherPublicKey(publicKeyStr);
      
      let actualTargetUserId: string | undefined = targetUserId;

      // If no targetUserId provided (manual input), try to find the user on the server
      if (!actualTargetUserId) {
        try {
          const lookupResponse = await fetch(`/api/keys?lookup=${encodeURIComponent(publicKeyStr)}`, {
            headers: {
              "x-user-id": userId,
            },
          });
          const lookupData = await lookupResponse.json();
          if (lookupData.found && lookupData.userId) {
            actualTargetUserId = lookupData.userId;
          } else {
            setStatus("User not found on server. They need to be connected first.");
            return;
          }
        } catch (error) {
          console.error("Failed to lookup user:", error);
          setStatus("Failed to find user on server");
          return;
        }
      }

      // Set the other user ID if we have it
      if (actualTargetUserId) {
        setOtherUserId(actualTargetUserId);
      }

      // Only generate AES key if we're the "initiator" (determined by comparing user IDs)
      // This ensures only one user generates the key to avoid conflicts
      if (!aesKey && myPublicKey) {
        // Use lexicographic comparison to deterministically decide who generates the key
        // The user with the "smaller" public key generates the AES key
        const shouldGenerateKey = myPublicKey < publicKeyStr;
        
        if (shouldGenerateKey) {
          // We generate the AES key and send it to the other user
          const newAESKey = await generateAESKey();
          setAesKey(newAESKey);
          const encryptedAESKey = await encryptAESKeyWithRSA(newAESKey, otherKey);

          // Send encrypted AES key to the other user via server
          try {
            const response = await fetch("/api/keys", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": userId,
              },
              body: JSON.stringify({
                encryptedAESKey,
                targetUserId: actualTargetUserId,
              }),
            });
            
            if (response.ok) {
              keyEstablishedTimestampRef.current = Date.now();
              // Clear processed message IDs when a new key is established
              processedMessageIdsRef.current.clear();
              setStatus("Secure connection established - You can now send messages");
            } else {
              throw new Error("Failed to send encrypted AES key");
            }
          } catch (error) {
            console.error("Failed to send encrypted AES key:", error);
            setStatus("Failed to establish connection");
          }
        } else {
          // We wait for the other user to send us the encrypted AES key
          setStatus("Waiting for secure key exchange...");
        }
      }
    } catch (error) {
      console.error("Failed to establish connection:", error);
      setStatus("Failed to establish connection - Invalid public key");
    }
  };

  // Handle manual key input from KeyShare component
  const handleManualKeyInput = async (publicKeyStr: string) => {
    await handleReceivePublicKey(publicKeyStr);
  };

  // Handle receiving encrypted message
  const handleReceiveMessage = async (encryptedMsg: EncryptedMessage) => {
    if (!myKeyPair || !aesKey) {
      console.warn("Cannot decrypt message: missing key pair or AES key");
      return;
    }

    try {
      // Validate inputs before attempting decryption
      if (!encryptedMsg.encrypted || !encryptedMsg.iv) {
        console.error("Invalid encrypted message structure");
        return;
      }

      const decrypted = await decryptMessage(
        encryptedMsg.encrypted,
        encryptedMsg.iv,
        aesKey
      );
      addMessage(decrypted, "other", true);
    } catch (error) {
      // Log the error but don't crash - this might be a message from a previous session
      console.warn("Failed to decrypt message (may be from previous session):", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: encryptedMsg.timestamp,
        keyEstablished: keyEstablishedTimestampRef.current,
      });
      // Don't add the message if decryption fails
    }
  };

  const addMessage = (text: string, sender: "me" | "other", encrypted = false) => {
    const newMessage: ChatMessageType = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      sender,
      timestamp: Date.now(),
      encrypted,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !aesKey || !otherPublicKey) {
      if (!otherPublicKey) {
        setStatus("Please wait for other user to connect");
        return;
      }
      if (!aesKey) {
        setStatus("Please wait for secure connection to be established");
        return;
      }
      return;
    }

    // Ensure key was established before sending
    if (!keyEstablishedTimestampRef.current) {
      setStatus("Please wait for secure connection to be established");
      return;
    }

    const messageText = inputValue.trim();
    setInputValue("");

    try {
      // Encrypt message
      const { encrypted, iv } = await encryptMessage(messageText, aesKey);

      // Send encrypted message to server
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ encrypted, iv }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Add message to UI
      addMessage(messageText, "me", true);
    } catch (error) {
      console.error("Failed to send message:", error);
      setStatus("Failed to send message");
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Secure Chat</h1>
              <p className="text-sm text-blue-100 mt-0.5 flex items-center gap-2">
                {aesKey && otherPublicKey ? (
                  <>
                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                    End-to-End Encrypted
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                    {status}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Exchange Section */}
      {myPublicKey && (
        <KeyShare
          myPublicKey={myPublicKey}
          onKeyReceived={handleManualKeyInput}
          isConnected={!!(otherPublicKey && aesKey)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white/50 dark:bg-gray-900/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {otherPublicKey && aesKey
                ? "Start chatting securely!"
                : "Waiting for connection..."}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              {otherPublicKey && aesKey
                ? "Your messages are encrypted with AES-256. Only you and the recipient can read them."
                : "Open this page in another browser to establish a secure connection."}
            </p>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={isInitializing || !aesKey || !otherPublicKey}
      />
    </div>
  );
}
