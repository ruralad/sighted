import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  chatMessages,
  chatRoomMembers,
  chatRooms,
  userPublicKeys,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2000;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastMessageId = 0;
      let lastRoomCount = -1;
      let lastKeyFingerprint = "";
      let aborted = false;

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`),
      );

      async function poll() {
        if (aborted) return;

        try {
          const memberships = await db
            .select({ roomId: chatRoomMembers.roomId })
            .from(chatRoomMembers)
            .where(eq(chatRoomMembers.userId, userId));

          const roomIds = memberships.map((m) => m.roomId);

          let roomsChanged = false;

          if (roomIds.length !== lastRoomCount) {
            const prev = lastRoomCount;
            lastRoomCount = roomIds.length;
            if (prev !== -1) roomsChanged = true;
          }

          if (roomIds.length > 0 && !roomsChanged) {
            const allMembers = await db
              .select({
                memberId: chatRoomMembers.userId,
                keyId: userPublicKeys.id,
              })
              .from(chatRoomMembers)
              .leftJoin(userPublicKeys, eq(chatRoomMembers.userId, userPublicKeys.userId))
              .where(sql`${chatRoomMembers.roomId} IN ${roomIds}`);

            const fingerprint = allMembers
              .map((m) => `${m.memberId}:${m.keyId ?? ""}`)
              .sort()
              .join("|");

            if (lastKeyFingerprint && fingerprint !== lastKeyFingerprint) {
              roomsChanged = true;
            }
            lastKeyFingerprint = fingerprint;
          }

          if (roomsChanged) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "rooms_changed" })}\n\n`,
              ),
            );
          }

          if (roomIds.length > 0) {
            const validRooms = await db
              .select({ id: chatRooms.id })
              .from(chatRooms)
              .where(
                and(
                  sql`${chatRooms.id} IN ${roomIds}`,
                  sql`${chatRooms.expiresAt} > now()`,
                ),
              );

            const validRoomIds = validRooms.map((r) => r.id);

            if (validRoomIds.length > 0) {
              const conditions = [
                sql`${chatMessages.roomId} IN ${validRoomIds}`,
              ];
              if (lastMessageId > 0) {
                conditions.push(sql`${chatMessages.id} > ${lastMessageId}`);
              }

              const newMessages = await db
                .select()
                .from(chatMessages)
                .where(and(...conditions))
                .orderBy(chatMessages.id)
                .limit(100);

              for (const msg of newMessages) {
                if (msg.id > lastMessageId) lastMessageId = msg.id;

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "message",
                      roomId: msg.roomId,
                      payload: {
                        id: msg.id,
                        roomId: msg.roomId,
                        senderId: msg.senderId,
                        ciphertext: msg.ciphertext,
                        iv: msg.iv,
                        senderPublicKeyId: msg.senderPublicKeyId,
                        contentType: msg.contentType,
                        createdAt: msg.createdAt.toISOString(),
                      },
                    })}\n\n`,
                  ),
                );
              }
            }
          }
        } catch {
          /* db error — retry next poll */
        }

        if (!aborted) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      }

      async function init() {
        try {
          const memberships = await db
            .select({ roomId: chatRoomMembers.roomId })
            .from(chatRoomMembers)
            .where(eq(chatRoomMembers.userId, userId));

          const roomIds = memberships.map((m) => m.roomId);
          lastRoomCount = roomIds.length;

          if (roomIds.length > 0) {
            const latest = await db
              .select({ maxId: sql<number>`COALESCE(MAX(${chatMessages.id}), 0)` })
              .from(chatMessages)
              .where(sql`${chatMessages.roomId} IN ${roomIds}`);

            lastMessageId = latest[0]?.maxId ?? 0;

            const allMembers = await db
              .select({
                memberId: chatRoomMembers.userId,
                keyId: userPublicKeys.id,
              })
              .from(chatRoomMembers)
              .leftJoin(userPublicKeys, eq(chatRoomMembers.userId, userPublicKeys.userId))
              .where(sql`${chatRoomMembers.roomId} IN ${roomIds}`);

            lastKeyFingerprint = allMembers
              .map((m) => `${m.memberId}:${m.keyId ?? ""}`)
              .sort()
              .join("|");
          }
        } catch {
          /* proceed with defaults */
        }

        setTimeout(poll, POLL_INTERVAL_MS);
      }

      init();

      const heartbeat = setInterval(() => {
        if (aborted) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      req.signal.addEventListener("abort", () => {
        aborted = true;
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
