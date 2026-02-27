"use server";

import { verifySession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  users,
  userPublicKeys,
  chatRooms,
  chatRoomMembers,
  chatMessages,
} from "@/lib/db/schema";
import { eq, and, lt, sql, ilike, ne } from "drizzle-orm";

async function requireUserId(): Promise<string> {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");
  return session.userId;
}

// ── Public Key Management ────────────────────────────────────

export async function uploadPublicKey(
  publicKeyJwk: string,
  keyId: string,
): Promise<void> {
  const userId = await requireUserId();

  await db
    .insert(userPublicKeys)
    .values({ id: keyId, userId, publicKey: publicKeyJwk })
    .onConflictDoUpdate({
      target: userPublicKeys.id,
      set: { publicKey: publicKeyJwk },
    });

}

export async function getUserPublicKey(
  userId: string,
): Promise<{ keyId: string; publicKey: string } | null> {
  await requireUserId();

  const rows = await db
    .select({ keyId: userPublicKeys.id, publicKey: userPublicKeys.publicKey })
    .from(userPublicKeys)
    .where(eq(userPublicKeys.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

// ── User Search ──────────────────────────────────────────────

export async function searchUsers(
  query: string,
): Promise<{ id: string; username: string; displayName: string }[]> {
  const userId = await requireUserId();
  if (!query || query.length < 2) return [];

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(and(ilike(users.username, `%${query}%`), ne(users.id, userId)))
    .limit(10);

  return rows;
}

// ── Room Management ──────────────────────────────────────────

export async function createDmRoom(
  peerId: string,
  myEncryptedRoomKey: string | null,
  peerEncryptedRoomKey: string | null,
): Promise<string> {
  const userId = await requireUserId();
  const roomId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.insert(chatRooms).values({
    id: roomId,
    type: "dm",
    createdBy: userId,
    createdAt: now,
    expiresAt,
  });

  await db.insert(chatRoomMembers).values([
    {
      roomId,
      userId,
      encryptedRoomKey: myEncryptedRoomKey,
      joinedAt: now,
    },
    {
      roomId,
      userId: peerId,
      encryptedRoomKey: peerEncryptedRoomKey,
      joinedAt: now,
    },
  ]);

  return roomId;
}

export async function createGroupRoom(
  name: string,
  memberIds: string[],
  encryptedRoomKeys: Record<string, string>,
  questionId?: number,
): Promise<string> {
  const userId = await requireUserId();
  const roomId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.insert(chatRooms).values({
    id: roomId,
    type: "group",
    name,
    questionId: questionId ?? null,
    createdBy: userId,
    createdAt: now,
    expiresAt,
  });

  const allMembers = [userId, ...memberIds.filter((id) => id !== userId)];
  await db.insert(chatRoomMembers).values(
    allMembers.map((uid) => ({
      roomId,
      userId: uid,
      encryptedRoomKey: encryptedRoomKeys[uid] ?? null,
      joinedAt: now,
    })),
  );

  return roomId;
}

// ── Messages ─────────────────────────────────────────────────

export async function sendMessage(
  roomId: string,
  ciphertext: string,
  iv: string,
  senderPublicKeyId: string | null,
  contentType: string,
): Promise<{ id: number; createdAt: string }> {
  const userId = await requireUserId();

  const [msg] = await db
    .insert(chatMessages)
    .values({
      roomId,
      senderId: userId,
      ciphertext,
      iv,
      senderPublicKeyId,
      contentType,
    })
    .returning({ id: chatMessages.id, createdAt: chatMessages.createdAt });

  return { id: msg!.id, createdAt: msg!.createdAt.toISOString() };
}

// ── Queries ──────────────────────────────────────────────────

export interface RoomInfo {
  id: string;
  type: string;
  name: string | null;
  questionId: number | null;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  encryptedRoomKey: string | null;
  members: {
    userId: string;
    username: string;
    displayName: string;
    publicKeyId: string | null;
    publicKey: string | null;
  }[];
}

export async function getRooms(): Promise<RoomInfo[]> {
  const userId = await requireUserId();

  const myMemberships = await db
    .select({ roomId: chatRoomMembers.roomId })
    .from(chatRoomMembers)
    .where(eq(chatRoomMembers.userId, userId));

  if (myMemberships.length === 0) return [];

  const roomIds = myMemberships.map((m) => m.roomId);

  const roomRows = await db
    .select()
    .from(chatRooms)
    .where(
      and(
        sql`${chatRooms.id} IN ${roomIds}`,
        sql`${chatRooms.expiresAt} > now()`,
      ),
    );

  if (roomRows.length === 0) return [];

  const validRoomIds = roomRows.map((r) => r.id);

  const allMembers = await db
    .select({
      roomId: chatRoomMembers.roomId,
      memberId: chatRoomMembers.userId,
      encryptedRoomKey: chatRoomMembers.encryptedRoomKey,
      username: users.username,
      displayName: users.displayName,
      publicKeyId: userPublicKeys.id,
      publicKey: userPublicKeys.publicKey,
    })
    .from(chatRoomMembers)
    .innerJoin(users, eq(chatRoomMembers.userId, users.id))
    .leftJoin(userPublicKeys, eq(chatRoomMembers.userId, userPublicKeys.userId))
    .where(sql`${chatRoomMembers.roomId} IN ${validRoomIds}`);

  return roomRows.map((room) => {
    const roomMembers = allMembers.filter((m) => m.roomId === room.id);
    const myMembership = roomMembers.find((m) => m.memberId === userId);

    return {
      id: room.id,
      type: room.type,
      name: room.name,
      questionId: room.questionId,
      createdBy: room.createdBy,
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
      encryptedRoomKey: myMembership?.encryptedRoomKey ?? null,
      members: roomMembers.map((m) => ({
        userId: m.memberId,
        username: m.username,
        displayName: m.displayName,
        publicKeyId: m.publicKeyId,
        publicKey: m.publicKey,
      })),
    };
  });
}

export async function getMessages(
  roomId: string,
  afterId?: number,
): Promise<
  {
    id: number;
    senderId: string;
    ciphertext: string;
    iv: string;
    senderPublicKeyId: string | null;
    contentType: string;
    createdAt: string;
  }[]
> {
  const userId = await requireUserId();

  const membership = await db
    .select()
    .from(chatRoomMembers)
    .where(
      and(
        eq(chatRoomMembers.roomId, roomId),
        eq(chatRoomMembers.userId, userId),
      ),
    )
    .limit(1);

  if (membership.length === 0) throw new Error("Not a member of this room");

  const conditions = [eq(chatMessages.roomId, roomId)];
  if (afterId !== undefined) {
    conditions.push(sql`${chatMessages.id} > ${afterId}`);
  }

  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(chatMessages.id)
    .limit(200);

  return rows.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    ciphertext: r.ciphertext,
    iv: r.iv,
    senderPublicKeyId: r.senderPublicKeyId,
    contentType: r.contentType,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ── Purge ────────────────────────────────────────────────────

export async function purgeExpired(): Promise<{ deletedRooms: number }> {
  const result = await db
    .delete(chatRooms)
    .where(lt(chatRooms.expiresAt, new Date()))
    .returning({ id: chatRooms.id });

  return { deletedRooms: result.length };
}
