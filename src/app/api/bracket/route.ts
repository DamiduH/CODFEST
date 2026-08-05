import { NextResponse } from "next/server";
import { getBracket } from "@/lib/bracket";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ bracket: await getBracket() });
}
