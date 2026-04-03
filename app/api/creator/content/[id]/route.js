import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { deletePendingContentSubmission } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function DELETE(_request, { params }) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const resolved = await params;
  const id = resolved?.id;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing content id" }, { status: 400 });
  }

  const deleted = await deletePendingContentSubmission({
    creatorId: context.creator.id,
    contentId: id,
  });

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "Content not found or not pending" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "Deleted" });
}
