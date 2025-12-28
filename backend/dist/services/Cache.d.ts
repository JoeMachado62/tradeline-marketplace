export declare class CacheService {
    private client;
    private connected;
    constructor(redisUrl?: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private isConnected;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    flush(): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    keys: {
        pricing: (brokerId?: string) => string;
        broker: (brokerId: string) => string;
        brokerByApiKey: (apiKey: string) => string;
        order: (orderId: string) => string;
        analytics: (brokerId: string, date: string) => string;
    };
}
export declare function getCacheService(): CacheService;
export default CacheService;
//# sourceMappingURL=Cache.d.ts.map