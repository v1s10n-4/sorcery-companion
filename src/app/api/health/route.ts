import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await prisma.card.count();
    return NextResponse.json(
      { ok: true, cardCount: count },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
