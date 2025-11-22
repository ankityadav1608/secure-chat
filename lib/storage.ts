/**
 * Storage abstraction for keys and messages
 * Supports both in-memory (dev) and Redis (production)
 */

interface KeyStorage {
  publicKey: string;
  encryptedAESKey?: string;
  timestamp: number;
}

interface StoredMessage {
  id: string;
  encrypted: string;
  iv: string;
  timestamp: number;
  senderId: string;
}

// In-memory storage (fallback)
const inMemoryKeys = new Map<string, KeyStorage>();
const inMemoryMessages = new Map<string, StoredMessage[]>();

// Check if Redis is available
let useRedis = false;
let redisClient: any = null;

async function initRedis() {
  if (typeof process !== 'undefined' && process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const { Redis } = await import('@upstash/redis');
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      useRedis = true;
      console.log('[Storage] Using Redis for persistence');
      return true;
    } catch (error) {
      console.warn('[Storage] Redis not available, using in-memory storage:', error);
      useRedis = false;
      return false;
    }
  }
  return false;
}

// Initialize Redis on module load (server-side only)
if (typeof window === 'undefined') {
  initRedis();
}

// Key storage functions
export async function setKey(userId: string, keyData: KeyStorage): Promise<void> {
  if (useRedis && redisClient) {
    await redisClient.set(`key:${userId}`, JSON.stringify(keyData), { ex: 3600 }); // 1 hour TTL
  } else {
    inMemoryKeys.set(userId, keyData);
  }
}

export async function getKey(userId: string): Promise<KeyStorage | undefined> {
  if (useRedis && redisClient) {
    const data = await redisClient.get(`key:${userId}`);
    return data ? JSON.parse(data as string) : undefined;
  } else {
    return inMemoryKeys.get(userId);
  }
}

export async function getAllKeys(): Promise<Map<string, KeyStorage>> {
  if (useRedis && redisClient) {
    const keys = await redisClient.keys('key:*');
    const result = new Map<string, KeyStorage>();
    for (const key of keys) {
      const userId = key.replace('key:', '');
      const data = await getKey(userId);
      if (data) {
        result.set(userId, data);
      }
    }
    return result;
  } else {
    return new Map(inMemoryKeys);
  }
}

export async function findKeyByPublicKey(publicKey: string): Promise<{ userId: string; keyData: KeyStorage } | null> {
  const allKeys = await getAllKeys();
  for (const [userId, keyData] of allKeys.entries()) {
    if (keyData.publicKey === publicKey) {
      return { userId, keyData };
    }
  }
  return null;
}

// Message storage functions
export async function addMessage(userId: string, message: StoredMessage): Promise<void> {
  if (useRedis && redisClient) {
    const key = `messages:${userId}`;
    const existing = await redisClient.lrange(key, 0, -1);
    const messages = existing.map((m: string) => JSON.parse(m));
    messages.push(message);
    // Keep only last 100 messages per user
    const trimmed = messages.slice(-100);
    await redisClient.del(key);
    if (trimmed.length > 0) {
      await redisClient.rpush(key, ...trimmed.map((m: StoredMessage) => JSON.stringify(m)));
      await redisClient.expire(key, 3600); // 1 hour TTL
    }
  } else {
    if (!inMemoryMessages.has(userId)) {
      inMemoryMessages.set(userId, []);
    }
    inMemoryMessages.get(userId)!.push(message);
  }
}

export async function getMessages(userId: string): Promise<StoredMessage[]> {
  if (useRedis && redisClient) {
    const key = `messages:${userId}`;
    const messages = await redisClient.lrange(key, 0, -1);
    await redisClient.del(key); // Clear after retrieval
    return messages.map((m: string) => JSON.parse(m));
  } else {
    const messages = inMemoryMessages.get(userId) || [];
    inMemoryMessages.set(userId, []); // Clear after retrieval
    return messages;
  }
}

export async function broadcastMessage(senderId: string, message: StoredMessage): Promise<void> {
  const allKeys = await getAllKeys();
  for (const userId of allKeys.keys()) {
    if (userId !== senderId) {
      await addMessage(userId, message);
    }
  }
}

