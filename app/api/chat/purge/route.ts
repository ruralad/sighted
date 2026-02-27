import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatRooms } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .delete(chatRooms)
    .where(lt(chatRooms.expiresAt, new Date()))
    .returning({ id: chatRooms.id });

  return NextResponse.json({
    purged: result.length,
    timestamp: new Date().toISOString(),
  });
}
