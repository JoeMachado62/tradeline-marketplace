import { prisma } from "./Database";

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import { config } from "../config";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const parseCreditReportWithAI = async (filePath: string): Promise<string[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const fileBase64 = fileBuffer.toString("base64");
    
    // Determine mime type (basic check or assume PDF/Image based on extension or use a library)
    // For now, let's assume valid types coming from Multer.
    // If we need strict MIME type detection, we can use a library.
    // Let's implement a simple check.
    const isPdf = filePath.toLowerCase().endsWith(".pdf");
    const mimeType = isPdf ? "application/pdf" : "image/jpeg"; // Default to jpeg for images if not pdf

    const prompt = `
      Analyze this credit report document.
      Identify all unique bank names, lenders, or creditors listed in the report.
      Return ONLY a JSON object with a single key "creditors" containing an array of strings of the bank names.
      Example: { "creditors": ["Chase", "Bank of America", "Citibank"] }
      Do not include markdown formatting (like \`\`\`json), just the raw JSON string.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present (Gemini often adds them even if asked not to)
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(cleanText);
    
    if (Array.isArray(data.creditors)) {
      return data.creditors;
    }
    
    return [];
  } catch (error) {
    console.error("Gemini AI API Error:", error);
    // Fallback or throw? Let's throw to handle it in the service
    throw new Error("Failed to analyze credit report");
  }
};

export class ClientService {
  
  /**
   * Find or create a client by email
   */
  async getOrCreateClient(data: { email: string; name?: string; phone?: string }) {
    // Normalize email
    const email = data.email.toLowerCase().trim();
    
    // Check if exists
    let client = await (prisma as any).client.findUnique({
      where: { email }
    });
    
    // If not, create
    if (!client) {
      client = await (prisma as any).client.create({
        data: {
          email,
          name: data.name,
          phone: data.phone,
          excluded_banks: []
        }
      });
    } else if (data.name || data.phone) {
      // Update info if provided
      client = await (prisma as any).client.update({
        where: { id: client.id },
        data: {
          name: data.name || client.name,
          phone: data.phone || client.phone
        }
      });
    }
    
    return client;
  }
  
  /**
   * Process uploaded credit report
   */
  async processCreditReport(clientId: string, file: Express.Multer.File) {
    const client = await (prisma as any).client.findUnique({ where: { id: clientId } });
    if (!client) throw new Error("Client not found");
    
    // Store record in DB
    const report = await (prisma as any).creditReport.create({
      data: {
        client_id: clientId,
        filename: file.originalname,
        file_path: file.path,
        status: "PROCESSING",
        creditors_found: []
      }
    });
    
    try {
      // Trigger AI parsing
      const creditors = await parseCreditReportWithAI(file.path);
      
      // Update report with results
      await (prisma as any).creditReport.update({
        where: { id: report.id },
        data: {
          status: "PARSED",
          creditors_found: creditors,
          parsed_data: {
            summary: "AI Analysis Complete",
            creditors_detected: creditors
          }
        }
      });
      
      // Update client's excluded banks
      // Merge new findings with existing, ensuring uniqueness
      const existing = new Set(client.excluded_banks);
      creditors.forEach(c => existing.add(c));
      
      await (prisma as any).client.update({
        where: { id: clientId },
        data: {
          excluded_banks: Array.from(existing)
        }
      });
      
      return {
        success: true,
        report_id: report.id,
        creditors_found: creditors
      };
      
    } catch (error: any) {
      console.error("Credit report processing failed:", error);
      
      await (prisma as any).creditReport.update({
        where: { id: report.id },
        data: {
          status: "FAILED",
          parsed_data: { error: error.message }
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Get client profile with exclusions
   */
  async getClientProfile(clientId: string) {
    const client = await (prisma as any).client.findUnique({
      where: { id: clientId },
      include: {
        orders: {
          orderBy: { created_at: 'desc' },
          take: 5
        },
        credit_reports: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    return client;
  }
}

// Singleton
let clientServiceInstance: ClientService | null = null;

export function getClientService(): ClientService {
  if (!clientServiceInstance) {
    clientServiceInstance = new ClientService();
  }
  return clientServiceInstance;
}
