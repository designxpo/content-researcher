import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    console.log("Testing connection to Supabase...");
    const jobsCount = await prisma.scrapeJob.count();
    console.log(`Connection successful! Found ${jobsCount} scrape jobs.`);
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
