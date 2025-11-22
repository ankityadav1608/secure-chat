import { NextRequest, NextResponse } from "next/server";
import { setKey, getKey, getAllKeys, findKeyByPublicKey } from "@/lib/storage";

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

    const allKeys = await getAllKeys();
    console.log("[KEYS POST] Request:", { userId, hasPublicKey: !!publicKey, hasEncryptedAESKey: !!encryptedAESKey, targetUserId, keysSize: allKeys.size });

    if (encryptedAESKey && targetUserId) {
      // Store encrypted AES key for the target user
      const targetKey = await getKey(targetUserId);
      const allKeysList = Array.from(allKeys.keys());
      console.log("[KEYS POST] Storing encrypted AES key:", { targetUserId, found: !!targetKey, allKeys: allKeysList });
      if (targetKey) {
        targetKey.encryptedAESKey = encryptedAESKey;
        await setKey(targetUserId, targetKey);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { error: "Target user not found", availableUsers: allKeysList },
        { status: 404 }
      );
    }

    if (!publicKey) {
      return NextResponse.json(
        { error: "Missing public key" },
        { status: 400 }
      );
    }

    await setKey(userId, {
      publicKey,
      timestamp: Date.now(),
    });

    const updatedKeys = await getAllKeys();
    console.log("[KEYS POST] Registered public key:", { userId, keysSize: updatedKeys.size, allUsers: Array.from(updatedKeys.keys()) });

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

    const allKeys = await getAllKeys();
    console.log("[KEYS GET] Request:", { userId, lookupKey: lookupKey ? `${lookupKey.substring(0, 20)}...` : null, keysSize: allKeys.size, allUsers: Array.from(allKeys.keys()) });

    // If lookup parameter is provided, find user by public key
    if (lookupKey) {
      const found = await findKeyByPublicKey(lookupKey);
      if (found && found.userId !== userId) {
        console.log("[KEYS GET] Found user by public key:", { userId: found.userId });
        return NextResponse.json({ 
          userId: found.userId,
          publicKey: found.keyData.publicKey,
          found: true
        });
      }
      console.log("[KEYS GET] User not found by public key");
      return NextResponse.json({ 
        found: false,
        message: "User with this public key not found. They need to be connected to the server.",
        availableUsers: Array.from(allKeys.keys())
      });
    }

    const otherKeys: Array<{ userId: string; publicKey: string }> = [];
    let encryptedAESKey: string | undefined;

    // Check if we have an encrypted AES key stored for this user
    const myKey = await getKey(userId);
    if (myKey?.encryptedAESKey) {
      encryptedAESKey = myKey.encryptedAESKey;
      // Clear it after retrieval (one-time use)
      myKey.encryptedAESKey = undefined;
      await setKey(userId, myKey);
      console.log("[KEYS GET] Found encrypted AES key for user:", userId);
    }

    // Get other users' public keys
    for (const [otherUserId, keyData] of allKeys.entries()) {
      if (otherUserId !== userId) {
        otherKeys.push({
          userId: otherUserId,
          publicKey: keyData.publicKey,
        });
      }
    }

    console.log("[KEYS GET] Response:", { userId, otherKeysCount: otherKeys.length, hasEncryptedAESKey: !!encryptedAESKey });

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
