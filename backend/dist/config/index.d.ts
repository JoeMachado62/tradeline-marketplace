export declare const config: {
    env: string;
    port: number;
    tradeline: {
        consumerKey: string;
        consumerSecret: string;
        apiUrl: string;
    };
    database: {
        url: string;
    };
    redis: {
        url: string;
        ttl: {
            pricing: number;
            broker: number;
        };
    };
    stripe: {
        secretKey: string;
        webhookSecret: string;
        apiVersion: "2023-10-16";
    };
    jwt: {
        secret: string;
        expiry: string;
    };
    gemini: {
        apiKey: string;
        model: string;
    };
    commission: {
        platformCommissionPercent: number;
        minBrokerSharePercent: number;
        maxBrokerSharePercent: number;
        defaultBrokerSharePercent: number;
    };
    api: {
        corsOrigin: string;
        rateLimitWindow: number;
        rateLimitMax: number;
    };
    email: {
        host: string;
        port: number;
        user: string;
        password: string;
        from: string;
        adminEmail: string;
    };
};
//# sourceMappingURL=index.d.ts.map