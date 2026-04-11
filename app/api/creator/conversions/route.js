import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { listConversionsByCreator } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const conversions = await listConversionsByCreator(context.creator.id, 50);

  return NextResponse.json({
    success: true,
    data: { conversions },
  });
}
