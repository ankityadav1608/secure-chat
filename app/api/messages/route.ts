import { NextRequest, NextResponse } from "next/server";
import { broadcastMessage, getMessages } from "@/lib/storage";

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

    const message = {
      id: `${Date.now()}-${Math.random()}`,
      encrypted,
      iv,
      timestamp: Date.now(),
      senderId: userId,
    };

    // Broadcast message to all other users
    await broadcastMessage(userId, message);

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
    const userMessages = await getMessages(userId);

    return NextResponse.json({ messages: userMessages });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return NextResponse.json(
      { error: "Failed to retrieve messages" },
      { status: 500 }
    );
  }
}

