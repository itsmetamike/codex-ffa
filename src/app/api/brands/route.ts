import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // @ts-ignore - Prisma types need regeneration
    const vectorStores = await prisma.vectorStore.findMany({
      select: {
        brand: true
      },
      orderBy: {
        brand: "asc"
      },
      distinct: ['brand']
    });

    const brands = vectorStores.map((store: any) => store.brand);
    
    console.log("Vector stores from DB:", vectorStores);
    console.log("Extracted brands:", brands);

    return NextResponse.json({ success: true, brands });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
