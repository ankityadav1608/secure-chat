import { NextRequest, NextResponse } from "next/server";

// In-memory key storage
interface KeyStorage {
  publicKey: string;
  encryptedAESKey?: string; // Encrypted AES key for this user
  timestamp: number;
}

const keys: Map<string, KeyStorage> = new Map();

// Generate a simple user ID
function getUserId(request: NextRequest): string {
  const userId = request.headers.get("x-user-id") || `user-${Date.now()}-${Math.random()}`;
  return userId;
}

// POST - Store or update public key, or store encrypted AES key
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { publicKey, encryptedAESKey, targetUserId } = body;

    if (encryptedAESKey && targetUserId) {
      // Store encrypted AES key for the target user
      const targetKey = keys.get(targetUserId);
      if (targetKey) {
        targetKey.encryptedAESKey = encryptedAESKey;
        keys.set(targetUserId, targetKey);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    if (!publicKey) {
      return NextResponse.json(
        { error: "Missing public key" },
        { status: 400 }
      );
    }

    keys.set(userId, {
      publicKey,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Error storing key:", error);
    return NextResponse.json(
      { error: "Failed to store key" },
      { status: 500 }
    );
  }
}

// GET - Get other user's public key and encrypted AES key, or lookup user by public key
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const lookupKey = searchParams.get("lookup");

    // If lookup parameter is provided, find user by public key
    if (lookupKey) {
      for (const [uid, keyData] of keys.entries()) {
        if (keyData.publicKey === lookupKey && uid !== userId) {
          return NextResponse.json({ 
            userId: uid,
            publicKey: keyData.publicKey,
            found: true
          });
        }
      }
      return NextResponse.json({ 
        found: false,
        message: "User with this public key not found. They need to be connected to the server."
      });
    }

    const otherKeys: Array<{ userId: string; publicKey: string }> = [];
    let encryptedAESKey: string | undefined;

    // Check if we have an encrypted AES key stored for this user
    const myKey = keys.get(userId);
    if (myKey?.encryptedAESKey) {
      encryptedAESKey = myKey.encryptedAESKey;
      // Clear it after retrieval (one-time use)
      myKey.encryptedAESKey = undefined;
      keys.set(userId, myKey);
    }

    // Get other users' public keys
    keys.forEach((keyData, otherUserId) => {
      if (otherUserId !== userId) {
        otherKeys.push({
          userId: otherUserId,
          publicKey: keyData.publicKey,
        });
      }
    });

    return NextResponse.json({ 
      keys: otherKeys,
      encryptedAESKey: encryptedAESKey || null,
    });
  } catch (error) {
    console.error("Error retrieving keys:", error);
    return NextResponse.json(
      { error: "Failed to retrieve keys" },
      { status: 500 }
    );
  }
}
