import path from "path";
import fs from "fs";

// Load .env file BEFORE importing modules that depend on process.env
try {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
      if (match) {
        const key = match[1];
        const value = match[2];
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (err) {
  console.warn("Failed to load .env file:", err);
}

import { seedDemoData } from "../lib/seed-service";

async function main() {
  console.log("==================================================");
  console.log("STOCKSENSE SEEDING DEMO DATA (ACME MANUFACTURING)");
  console.log("==================================================");

  try {
    const res = await seedDemoData();
    console.log("✔", res.message);
    process.exit(0);
  } catch (err) {
    console.error("x Seeding failed:", err);
    process.exit(1);
  }
}

main();
