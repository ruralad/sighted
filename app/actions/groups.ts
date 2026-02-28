"use server";

import { verifySession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  users,
  groups,
  groupMembers,
  groupInvitations,
  groupSessions,
  groupSessionResults,
  chatRooms,
  chatRoomMembers,
} from "@/lib/db/schema";
import { eq, and, sql, ilike, ne, desc } from "drizzle-orm";

async function requireUserId(): Promise<string> {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");
  return session.userId;
}

// ── Types ────────────────────────────────────────────────────

export interface GroupMemberInfo {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  createdBy: string;
  chatRoomId: string | null;
  memberCount: number;
  members: GroupMemberInfo[];
  myRole: string;
  createdAt: string;
}

export interface InvitationInfo {
  id: number;
  groupId: string;
  groupName: string;
  inviterUsername: string;
  inviterDisplayName: string;
  status: string;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  groupId: string;
  questionId: number;
  durationSecs: number;
  startedBy: string;
  startedAt: string;
  status: string;
}

export interface SessionResultInfo {
  userId: string;
  username: string;
  displayName: string;
  completed: boolean;
  timeSpentSecs: number;
  submittedAt: string | null;
}

export interface BoardMemberStats {
  userId: string;
  username: string;
  displayName: string;
  totalSessions: number;
  completions: number;
  avgTimeSecs: number;
}

export interface BoardSessionDetail {
  sessionId: string;
  questionId: number;
  durationSecs: number;
  startedAt: string;
  status: string;
  results: SessionResultInfo[];
}

// ── Group CRUD ───────────────────────────────────────────────

const MAX_GROUPS_PER_USER = 5;

export async function createGroup(name: string): Promise<string> {
  const userId = await requireUserId();

  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 1 || trimmed.length > 50) {
    throw new Error("Group name must be 1-50 characters");
  }

  const existing = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.createdBy, userId));

  if (existing.length >= MAX_GROUPS_PER_USER) {
    throw new Error(`You can create at most ${MAX_GROUPS_PER_USER} groups`);
  }

  const groupId = crypto.randomUUID();
  const chatRoomId = crypto.randomUUID();
  const now = new Date();
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  await db.insert(chatRooms).values({
    id: chatRoomId,
    type: "group",
    name: trimmed,
    createdBy: userId,
    createdAt: now,
    expiresAt: farFuture,
  });

  await db.insert(chatRoomMembers).values({
    roomId: chatRoomId,
    userId,
    joinedAt: now,
  });

  await db.insert(groups).values({
    id: groupId,
    name: trimmed,
    createdBy: userId,
    chatRoomId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(groupMembers).values({
    groupId,
    userId,
    role: "admin",
    joinedAt: now,
  });

  return groupId;
}

export async function getMyGroups(): Promise<GroupInfo[]> {
  const userId = await requireUserId();

  const myMemberships = await db
    .select({ groupId: groupMembers.groupId, role: groupMembers.role })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  if (myMemberships.length === 0) return [];

  const groupIds = myMemberships.map((m) => m.groupId);

  const groupRows = await db
    .select()
    .from(groups)
    .where(sql`${groups.id} IN ${groupIds}`);

  const allMembers = await db
    .select({
      groupId: groupMembers.groupId,
      userId: groupMembers.userId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      username: users.username,
      displayName: users.displayName,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(sql`${groupMembers.groupId} IN ${groupIds}`);

  return groupRows.map((g) => {
    const members = allMembers.filter((m) => m.groupId === g.id);
    const myMembership = myMemberships.find((m) => m.groupId === g.id);

    return {
      id: g.id,
      name: g.name,
      createdBy: g.createdBy,
      chatRoomId: g.chatRoomId,
      memberCount: members.length,
      members: members.map((m) => ({
        userId: m.userId,
        username: m.username,
        displayName: m.displayName,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      myRole: myMembership?.role ?? "member",
      createdAt: g.createdAt.toISOString(),
    };
  });
}

export async function getGroupDetail(groupId: string): Promise<{
  group: GroupInfo;
  sessions: BoardSessionDetail[];
  board: BoardMemberStats[];
} | null> {
  const userId = await requireUserId();

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    )
    .limit(1);

  if (membership.length === 0) return null;

  const groupRows = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (groupRows.length === 0) return null;
  const g = groupRows[0]!;

  const allMembers = await db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      username: users.username,
      displayName: users.displayName,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  const group: GroupInfo = {
    id: g.id,
    name: g.name,
    createdBy: g.createdBy,
    chatRoomId: g.chatRoomId,
    memberCount: allMembers.length,
    members: allMembers.map((m) => ({
      userId: m.userId,
      username: m.username,
      displayName: m.displayName,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    myRole: membership[0]!.role,
    createdAt: g.createdAt.toISOString(),
  };

  const sessionRows = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.groupId, groupId))
    .orderBy(desc(groupSessions.startedAt));

  const sessionIds = sessionRows.map((s) => s.id);
  let allResults: {
    sessionId: string;
    usrId: string;
    completed: boolean;
    timeSpentSecs: number;
    submittedAt: Date | null;
    username: string;
    displayName: string;
  }[] = [];

  if (sessionIds.length > 0) {
    allResults = await db
      .select({
        sessionId: groupSessionResults.sessionId,
        usrId: groupSessionResults.userId,
        completed: groupSessionResults.completed,
        timeSpentSecs: groupSessionResults.timeSpentSecs,
        submittedAt: groupSessionResults.submittedAt,
        username: users.username,
        displayName: users.displayName,
      })
      .from(groupSessionResults)
      .innerJoin(users, eq(groupSessionResults.userId, users.id))
      .where(sql`${groupSessionResults.sessionId} IN ${sessionIds}`);
  }

  const sessions: BoardSessionDetail[] = sessionRows.map((s) => ({
    sessionId: s.id,
    questionId: s.questionId,
    durationSecs: s.durationSecs,
    startedAt: s.startedAt.toISOString(),
    status: s.status,
    results: allResults
      .filter((r) => r.sessionId === s.id)
      .map((r) => ({
        userId: r.usrId,
        username: r.username,
        displayName: r.displayName,
        completed: r.completed,
        timeSpentSecs: r.timeSpentSecs,
        submittedAt: r.submittedAt?.toISOString() ?? null,
      })),
  }));

  const memberStatsMap = new Map<
    string,
    { total: number; completions: number; totalTime: number; completedCount: number }
  >();

  for (const m of allMembers) {
    memberStatsMap.set(m.userId, {
      total: 0,
      completions: 0,
      totalTime: 0,
      completedCount: 0,
    });
  }

  for (const r of allResults) {
    const stats = memberStatsMap.get(r.usrId);
    if (stats) {
      stats.total += 1;
      if (r.completed) {
        stats.completions += 1;
        stats.totalTime += r.timeSpentSecs;
        stats.completedCount += 1;
      }
    }
  }

  const board: BoardMemberStats[] = allMembers.map((m) => {
    const stats = memberStatsMap.get(m.userId)!;
    return {
      userId: m.userId,
      username: m.username,
      displayName: m.displayName,
      totalSessions: stats.total,
      completions: stats.completions,
      avgTimeSecs:
        stats.completedCount > 0
          ? Math.round(stats.totalTime / stats.completedCount)
          : 0,
    };
  });

  return { group, sessions, board };
}

// ── Invitations ──────────────────────────────────────────────

export async function inviteToGroup(
  groupId: string,
  username: string,
): Promise<void> {
  const userId = await requireUserId();

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "admin"),
      ),
    )
    .limit(1);

  if (membership.length === 0) throw new Error("Only admins can invite members");

  const target = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (target.length === 0) throw new Error("User not found");
  const targetId = target[0]!.id;

  if (targetId === userId) throw new Error("Cannot invite yourself");

  const existingMember = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetId)),
    )
    .limit(1);

  if (existingMember.length > 0) throw new Error("User is already a member");

  const existingInvite = await db
    .select()
    .from(groupInvitations)
    .where(
      and(
        eq(groupInvitations.groupId, groupId),
        eq(groupInvitations.inviteeId, targetId),
        eq(groupInvitations.status, "pending"),
      ),
    )
    .limit(1);

  if (existingInvite.length > 0) throw new Error("Invitation already pending");

  await db.insert(groupInvitations).values({
    groupId,
    inviterId: userId,
    inviteeId: targetId,
    status: "pending",
  });
}

export async function getMyInvitations(): Promise<InvitationInfo[]> {
  const userId = await requireUserId();

  const rows = await db
    .select({
      id: groupInvitations.id,
      groupId: groupInvitations.groupId,
      groupName: groups.name,
      inviterUsername: users.username,
      inviterDisplayName: users.displayName,
      status: groupInvitations.status,
      createdAt: groupInvitations.createdAt,
    })
    .from(groupInvitations)
    .innerJoin(groups, eq(groupInvitations.groupId, groups.id))
    .innerJoin(users, eq(groupInvitations.inviterId, users.id))
    .where(
      and(
        eq(groupInvitations.inviteeId, userId),
        eq(groupInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(groupInvitations.createdAt));

  return rows.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    groupName: r.groupName,
    inviterUsername: r.inviterUsername,
    inviterDisplayName: r.inviterDisplayName,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function respondToInvitation(
  invitationId: number,
  accept: boolean,
): Promise<void> {
  const userId = await requireUserId();

  const rows = await db
    .select()
    .from(groupInvitations)
    .where(
      and(
        eq(groupInvitations.id, invitationId),
        eq(groupInvitations.inviteeId, userId),
        eq(groupInvitations.status, "pending"),
      ),
    )
    .limit(1);

  if (rows.length === 0) throw new Error("Invitation not found");
  const invite = rows[0]!;

  await db
    .update(groupInvitations)
    .set({ status: accept ? "accepted" : "declined" })
    .where(eq(groupInvitations.id, invitationId));

  if (accept) {
    const now = new Date();

    await db.insert(groupMembers).values({
      groupId: invite.groupId,
      userId,
      role: "member",
      joinedAt: now,
    });

    const groupRow = await db
      .select({ chatRoomId: groups.chatRoomId })
      .from(groups)
      .where(eq(groups.id, invite.groupId))
      .limit(1);

    if (groupRow[0]?.chatRoomId) {
      await db
        .insert(chatRoomMembers)
        .values({
          roomId: groupRow[0].chatRoomId,
          userId,
          joinedAt: now,
        })
        .onConflictDoNothing();
    }
  }
}

// ── Sessions ─────────────────────────────────────────────────

export async function startGroupSession(
  groupId: string,
  questionId: number,
  durationSecs: number,
): Promise<string> {
  const userId = await requireUserId();

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "admin"),
      ),
    )
    .limit(1);

  if (membership.length === 0) throw new Error("Only admins can start sessions");

  const activeSessions = await db
    .select()
    .from(groupSessions)
    .where(
      and(
        eq(groupSessions.groupId, groupId),
        eq(groupSessions.status, "active"),
      ),
    )
    .limit(1);

  if (activeSessions.length > 0) throw new Error("A session is already active");

  const sessionId = crypto.randomUUID();
  const now = new Date();

  await db.insert(groupSessions).values({
    id: sessionId,
    groupId,
    questionId,
    durationSecs,
    startedBy: userId,
    startedAt: now,
    status: "active",
  });

  return sessionId;
}

export async function getActiveSession(
  groupId: string,
): Promise<SessionInfo | null> {
  const userId = await requireUserId();

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    )
    .limit(1);

  if (membership.length === 0) return null;

  const rows = await db
    .select()
    .from(groupSessions)
    .where(
      and(
        eq(groupSessions.groupId, groupId),
        eq(groupSessions.status, "active"),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const s = rows[0]!;

  return {
    id: s.id,
    groupId: s.groupId,
    questionId: s.questionId,
    durationSecs: s.durationSecs,
    startedBy: s.startedBy,
    startedAt: s.startedAt.toISOString(),
    status: s.status,
  };
}

export async function submitSessionResult(
  sessionId: string,
  completed: boolean,
  timeSpentSecs: number,
  code?: string,
): Promise<void> {
  const userId = await requireUserId();

  const sessionRows = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.id, sessionId))
    .limit(1);

  if (sessionRows.length === 0) throw new Error("Session not found");
  const session = sessionRows[0]!;

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, session.groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .limit(1);

  if (membership.length === 0) throw new Error("Not a member of this group");

  await db
    .insert(groupSessionResults)
    .values({
      sessionId,
      userId,
      completed,
      timeSpentSecs,
      submittedAt: new Date(),
      code: code ?? null,
    })
    .onConflictDoUpdate({
      target: [groupSessionResults.sessionId, groupSessionResults.userId],
      set: {
        completed,
        timeSpentSecs,
        submittedAt: new Date(),
        code: code ?? null,
      },
    });
}

export async function endGroupSession(sessionId: string): Promise<void> {
  const userId = await requireUserId();

  const sessionRows = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.id, sessionId))
    .limit(1);

  if (sessionRows.length === 0) throw new Error("Session not found");
  const session = sessionRows[0]!;

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, session.groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "admin"),
      ),
    )
    .limit(1);

  if (membership.length === 0) throw new Error("Only admins can end sessions");

  await db
    .update(groupSessions)
    .set({ status: "completed" })
    .where(eq(groupSessions.id, sessionId));
}

export async function getSessionResults(
  sessionId: string,
): Promise<SessionResultInfo[]> {
  const userId = await requireUserId();

  const sessionRows = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.id, sessionId))
    .limit(1);

  if (sessionRows.length === 0) return [];
  const session = sessionRows[0]!;

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, session.groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .limit(1);

  if (membership.length === 0) return [];

  const rows = await db
    .select({
      userId: groupSessionResults.userId,
      completed: groupSessionResults.completed,
      timeSpentSecs: groupSessionResults.timeSpentSecs,
      submittedAt: groupSessionResults.submittedAt,
      username: users.username,
      displayName: users.displayName,
    })
    .from(groupSessionResults)
    .innerJoin(users, eq(groupSessionResults.userId, users.id))
    .where(eq(groupSessionResults.sessionId, sessionId));

  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    displayName: r.displayName,
    completed: r.completed,
    timeSpentSecs: r.timeSpentSecs,
    submittedAt: r.submittedAt?.toISOString() ?? null,
  }));
}

// ── Member management ────────────────────────────────────────

export async function leaveGroup(groupId: string): Promise<void> {
  const userId = await requireUserId();

  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    )
    .limit(1);

  if (membership.length === 0) throw new Error("Not a member");

  if (membership[0]!.role === "admin") {
    const otherAdmins = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.role, "admin"),
          ne(groupMembers.userId, userId),
        ),
      )
      .limit(1);

    if (otherAdmins.length === 0) {
      throw new Error("Cannot leave: you are the only admin. Promote another member first.");
    }
  }

  await db
    .delete(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    );

  const groupRow = await db
    .select({ chatRoomId: groups.chatRoomId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (groupRow[0]?.chatRoomId) {
    await db
      .delete(chatRoomMembers)
      .where(
        and(
          eq(chatRoomMembers.roomId, groupRow[0].chatRoomId),
          eq(chatRoomMembers.userId, userId),
        ),
      );
  }
}

export async function removeFromGroup(
  groupId: string,
  targetUserId: string,
): Promise<void> {
  const userId = await requireUserId();

  const adminCheck = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "admin"),
      ),
    )
    .limit(1);

  if (adminCheck.length === 0) throw new Error("Only admins can remove members");
  if (targetUserId === userId) throw new Error("Cannot remove yourself");

  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, targetUserId),
      ),
    );

  const groupRow = await db
    .select({ chatRoomId: groups.chatRoomId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (groupRow[0]?.chatRoomId) {
    await db
      .delete(chatRoomMembers)
      .where(
        and(
          eq(chatRoomMembers.roomId, groupRow[0].chatRoomId),
          eq(chatRoomMembers.userId, targetUserId),
        ),
      );
  }
}

// ── Search (reuse for invite) ────────────────────────────────

export async function searchUsersForInvite(
  query: string,
  groupId: string,
): Promise<{ id: string; username: string; displayName: string }[]> {
  const userId = await requireUserId();
  if (!query || query.length < 2) return [];

  const currentMembers = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const memberIds = currentMembers.map((m) => m.userId);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(and(ilike(users.username, `%${query}%`), ne(users.id, userId)))
    .limit(20);

  return rows.filter((r) => !memberIds.includes(r.id)).slice(0, 10);
}
