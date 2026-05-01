import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { refreshPendingBacklinksForUser } from "@/lib/ensure-backlinks";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await refreshPendingBacklinksForUser(session.user.id);
  return NextResponse.json(result);
}
