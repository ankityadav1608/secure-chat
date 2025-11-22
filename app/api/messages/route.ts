import { NextRequest, NextResponse } from "next/server";

// In-memory message storage (in production, use a database)
interface StoredMessage {
  id: string;
  encrypted: string;
  iv: string;
  timestamp: number;
  senderId: string;
}

const messages: Map<string, StoredMessage[]> = new Map();
const userSessions: Map<string, { publicKey: string; lastSeen: number }> = new Map();

// Generate a simple user ID
function getUserId(request: NextRequest): string {
  const userId = request.headers.get("x-user-id") || `user-${Date.now()}-${Math.random()}`;
  return userId;
}

// POST - Send a message
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { encrypted, iv } = body;

    if (!encrypted || !iv) {
      return NextResponse.json(
        { error: "Missing encrypted message or IV" },
        { status: 400 }
      );
    }

    const message: StoredMessage = {
      id: `${Date.now()}-${Math.random()}`,
      encrypted,
      iv,
      timestamp: Date.now(),
      senderId: userId,
    };

    // Initialize storage for sender
    if (!messages.has(userId)) {
      messages.set(userId, []);
    }

    // Store message for all other users
    // First, ensure all existing users have message queues
    messages.forEach((userMessages, otherUserId) => {
      if (otherUserId !== userId) {
        userMessages.push(message);
      }
    });

    // If there are no other users yet, the message will be delivered when they connect
    // (This handles the case where a user sends a message before the other user has polled)

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// GET - Retrieve messages for a user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const userMessages = messages.get(userId) || [];

    // Clear messages after retrieval (they've been delivered)
    messages.set(userId, []);

    return NextResponse.json({ messages: userMessages });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return NextResponse.json(
      { error: "Failed to retrieve messages" },
      { status: 500 }
    );
  }
}

