import { PrismaClient } from '@prisma/client';
declare class Database {
    private static instance;
    private constructor();
    static getInstance(): PrismaClient;
    static connect(): Promise<void>;
    static disconnect(): Promise<void>;
    static healthCheck(): Promise<boolean>;
}
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default Database;
//# sourceMappingURL=Database.d.ts.map