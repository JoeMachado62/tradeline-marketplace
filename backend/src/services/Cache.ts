import { createClient, RedisClientType } from "redis";
import { config } from "../config";

export class CacheService {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || config.redis.url,
    });

    this.client.on("error", (err) => {
      console.error("Redis Client Error:", err);
      // Don't exit, cache is optional
      this.connected = false;
    });

    this.client.on("connect", () => {
      console.log("✅ Redis cache connected");
      this.connected = true;
    });

    this.client.on("ready", () => {
      this.connected = true;
    });

    this.client.on("end", () => {
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error("Failed to connect to Redis:", error);
        // Cache is optional, don't throw
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  private isConnected(): boolean {
    return this.connected;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || config.redis.ttl.pricing;

      await this.client.setEx(key, ttl, serialized);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async flush(): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.client.flushAll();
      console.log("Cache flushed");
    } catch (error) {
      console.error("Cache flush error:", error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `Invalidated ${keys.length} cache entries matching ${pattern}`
        );
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  // Cache key generators for consistency
  keys = {
    pricing: (brokerId?: string) =>
      brokerId ? `pricing:broker:${brokerId}` : "pricing:base",

    broker: (brokerId: string) => `broker:${brokerId}`,

    brokerByApiKey: (apiKey: string) => `broker:apikey:${apiKey}`,

    order: (orderId: string) => `order:${orderId}`,

    analytics: (brokerId: string, date: string) =>
      `analytics:${brokerId}:${date}`,
  };
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

export default CacheService;
