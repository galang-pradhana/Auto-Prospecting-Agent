import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { status: 'LIVE', htmlCode: { not: null } },
    select: { htmlCode: true }
  });
  if (lead) {
    console.log(lead.htmlCode.substring(0, 1500)); // Print first 1500 chars to see structure
    console.log("...");
    console.log(lead.htmlCode.substring(lead.htmlCode.length - 500)); // Print last 500 chars 
  } else {
    console.log("No LIVE leads with HTML found.");
  }
}
main().finally(() => prisma.$disconnect());
