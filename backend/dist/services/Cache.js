"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
exports.getCacheService = getCacheService;
const redis_1 = require("redis");
const config_1 = require("../config");
class CacheService {
    client;
    connected = false;
    constructor(redisUrl) {
        this.client = (0, redis_1.createClient)({
            url: redisUrl || config_1.config.redis.url,
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
    async connect() {
        if (!this.connected) {
            try {
                await this.client.connect();
            }
            catch (error) {
                console.error("Failed to connect to Redis:", error);
                // Cache is optional, don't throw
            }
        }
    }
    async disconnect() {
        if (this.connected) {
            await this.client.disconnect();
            this.connected = false;
        }
    }
    isConnected() {
        return this.connected;
    }
    async get(key) {
        if (!this.isConnected())
            return null;
        try {
            const value = await this.client.get(key);
            if (value) {
                return JSON.parse(value);
            }
            return null;
        }
        catch (error) {
            console.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        if (!this.isConnected())
            return;
        try {
            const serialized = JSON.stringify(value);
            const ttl = ttlSeconds || config_1.config.redis.ttl.pricing;
            await this.client.setEx(key, ttl, serialized);
        }
        catch (error) {
            console.error(`Cache set error for key ${key}:`, error);
        }
    }
    async delete(key) {
        if (!this.isConnected())
            return;
        try {
            await this.client.del(key);
        }
        catch (error) {
            console.error(`Cache delete error for key ${key}:`, error);
        }
    }
    async flush() {
        if (!this.isConnected())
            return;
        try {
            await this.client.flushAll();
            console.log("Cache flushed");
        }
        catch (error) {
            console.error("Cache flush error:", error);
        }
    }
    async invalidatePattern(pattern) {
        if (!this.isConnected())
            return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                console.log(`Invalidated ${keys.length} cache entries matching ${pattern}`);
            }
        }
        catch (error) {
            console.error(`Cache invalidate pattern error for ${pattern}:`, error);
        }
    }
    // Cache key generators for consistency
    keys = {
        pricing: (brokerId) => brokerId ? `pricing:broker:${brokerId}` : "pricing:base",
        broker: (brokerId) => `broker:${brokerId}`,
        brokerByApiKey: (apiKey) => `broker:apikey:${apiKey}`,
        order: (orderId) => `order:${orderId}`,
        analytics: (brokerId, date) => `analytics:${brokerId}:${date}`,
    };
}
exports.CacheService = CacheService;
// Singleton instance
let cacheInstance = null;
function getCacheService() {
    if (!cacheInstance) {
        cacheInstance = new CacheService();
    }
    return cacheInstance;
}
exports.default = CacheService;
//# sourceMappingURL=Cache.js.map