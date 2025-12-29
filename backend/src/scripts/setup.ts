import { getAuthService } from "../services/AuthService";
import Database from "../services/Database";

async function setup() {
  console.log("🔧 Running initial setup...\n");

  try {
    // Connect to database
    await Database.connect();

    // Create initial admin
    const authService = getAuthService();
    await authService.createInitialAdmin();

    console.log("✅ Setup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setup();
