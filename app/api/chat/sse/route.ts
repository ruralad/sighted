import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  chatMessages,
  chatRoomMembers,
  chatRooms,
  userPublicKeys,
  groupInvitations,
  groupSessions,
  groupMembers,
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
      let lastInvitationCount = -1;
      let lastSessionFingerprint = "";
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
          // ── Group invitations polling ──
          const pendingInvites = await db
            .select({ id: groupInvitations.id })
            .from(groupInvitations)
            .where(
              and(
                eq(groupInvitations.inviteeId, userId),
                eq(groupInvitations.status, "pending"),
              ),
            );

          const inviteCount = pendingInvites.length;
          if (lastInvitationCount !== -1 && inviteCount !== lastInvitationCount) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "group_invitation",
                  count: inviteCount,
                })}\n\n`,
              ),
            );
          }
          lastInvitationCount = inviteCount;

          // ── Group sessions polling ──
          const myGroupIds = await db
            .select({ groupId: groupMembers.groupId })
            .from(groupMembers)
            .where(eq(groupMembers.userId, userId));

          const gIds = myGroupIds.map((g) => g.groupId);
          if (gIds.length > 0) {
            const activeSessions = await db
              .select({
                id: groupSessions.id,
                groupId: groupSessions.groupId,
                status: groupSessions.status,
              })
              .from(groupSessions)
              .where(sql`${groupSessions.groupId} IN ${gIds}`);

            const sessionFp = activeSessions
              .map((s) => `${s.id}:${s.status}`)
              .sort()
              .join("|");

            if (lastSessionFingerprint && sessionFp !== lastSessionFingerprint) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "group_session_changed" })}\n\n`,
                ),
              );
            }
            lastSessionFingerprint = sessionFp;
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
          // Init group counters
          const initInvites = await db
            .select({ id: groupInvitations.id })
            .from(groupInvitations)
            .where(
              and(
                eq(groupInvitations.inviteeId, userId),
                eq(groupInvitations.status, "pending"),
              ),
            );
          lastInvitationCount = initInvites.length;

          const initGroups = await db
            .select({ groupId: groupMembers.groupId })
            .from(groupMembers)
            .where(eq(groupMembers.userId, userId));

          const initGIds = initGroups.map((g) => g.groupId);
          if (initGIds.length > 0) {
            const initSessions = await db
              .select({
                id: groupSessions.id,
                status: groupSessions.status,
              })
              .from(groupSessions)
              .where(sql`${groupSessions.groupId} IN ${initGIds}`);

            lastSessionFingerprint = initSessions
              .map((s) => `${s.id}:${s.status}`)
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
