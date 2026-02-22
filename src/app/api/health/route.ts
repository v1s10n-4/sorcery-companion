import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await prisma.card.count();
    return NextResponse.json({
      ok: true,
      cardCount: count,
      dbUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@"),
      directUrl: process.env.DIRECT_URL?.replace(/:[^@]+@/, ":***@"),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        dbUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@"),
        directUrl: process.env.DIRECT_URL?.replace(/:[^@]+@/, ":***@"),
        nodeEnv: process.env.NODE_ENV,
      },
      { status: 500 }
    );
  }
}
