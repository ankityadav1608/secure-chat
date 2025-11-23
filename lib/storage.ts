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
let redisInitAttempted = false;

async function initRedis() {
  if (redisInitAttempted) {
    return useRedis;
  }
  redisInitAttempted = true;

  if (typeof process !== 'undefined' && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      // Test connection
      await redisClient.ping();
      useRedis = true;
      console.log('[Storage] Using Redis for persistence');
      return true;
    } catch (error) {
      console.warn('[Storage] Redis not available, using in-memory storage:', error);
      useRedis = false;
      redisClient = null;
      return false;
    }
  } else {
    console.log('[Storage] Redis not configured, using in-memory storage');
  }
  return false;
}

// Lazy initialization - check Redis on first use
async function ensureRedis() {
  if (!redisInitAttempted) {
    await initRedis();
  }
  return useRedis && redisClient;
}

// Key storage functions
export async function setKey(userId: string, keyData: KeyStorage): Promise<void> {
  const hasRedis = await ensureRedis();
  if (hasRedis && redisClient) {
    try {
      await redisClient.set(`key:${userId}`, JSON.stringify(keyData), { ex: 3600 }); // 1 hour TTL
    } catch (error) {
      console.error('[Storage] Redis setKey error, falling back to memory:', error);
      inMemoryKeys.set(userId, keyData);
    }
  } else {
    inMemoryKeys.set(userId, keyData);
  }
}

export async function getKey(userId: string): Promise<KeyStorage | undefined> {
  const hasRedis = await ensureRedis();
  if (hasRedis && redisClient) {
    try {
      const data = await redisClient.get(`key:${userId}`);
      return data ? JSON.parse(data as string) : undefined;
    } catch (error) {
      console.error('[Storage] Redis getKey error, falling back to memory:', error);
      return inMemoryKeys.get(userId);
    }
  } else {
    return inMemoryKeys.get(userId);
  }
}

export async function getAllKeys(): Promise<Map<string, KeyStorage>> {
  const hasRedis = await ensureRedis();
  if (hasRedis && redisClient) {
    try {
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
    } catch (error) {
      console.error('[Storage] Redis getAllKeys error, falling back to memory:', error);
      return new Map(inMemoryKeys);
    }
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
  const hasRedis = await ensureRedis();
  if (hasRedis && redisClient) {
    try {
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
    } catch (error) {
      console.error('[Storage] Redis addMessage error, falling back to memory:', error);
      if (!inMemoryMessages.has(userId)) {
        inMemoryMessages.set(userId, []);
      }
      inMemoryMessages.get(userId)!.push(message);
    }
  } else {
    if (!inMemoryMessages.has(userId)) {
      inMemoryMessages.set(userId, []);
    }
    inMemoryMessages.get(userId)!.push(message);
  }
}

export async function getMessages(userId: string): Promise<StoredMessage[]> {
  const hasRedis = await ensureRedis();
  if (hasRedis && redisClient) {
    try {
      const key = `messages:${userId}`;
      const messages = await redisClient.lrange(key, 0, -1);
      await redisClient.del(key); // Clear after retrieval
      return messages.map((m: string) => JSON.parse(m));
    } catch (error) {
      console.error('[Storage] Redis getMessages error, falling back to memory:', error);
      const messages = inMemoryMessages.get(userId) || [];
      inMemoryMessages.set(userId, []); // Clear after retrieval
      return messages;
    }
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

