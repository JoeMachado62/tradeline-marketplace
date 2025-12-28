export declare class ClientService {
    /**
     * Find or create a client by email
     */
    getOrCreateClient(data: {
        email: string;
        name?: string;
        phone?: string;
    }): Promise<any>;
    /**
     * Process uploaded credit report
     */
    processCreditReport(clientId: string, file: Express.Multer.File): Promise<{
        success: boolean;
        report_id: any;
        creditors_found: string[];
    }>;
    /**
     * Get client profile with exclusions
     */
    getClientProfile(clientId: string): Promise<any>;
}
export declare function getClientService(): ClientService;
//# sourceMappingURL=ClientService.d.ts.map