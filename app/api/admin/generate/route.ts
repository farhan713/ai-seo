import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBlogForUser } from "@/lib/blog-service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const blog = await createBlogForUser(userId);
    return NextResponse.json(blog);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
