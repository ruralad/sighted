"use client";

import { create } from "zustand";
import {
  getMyGroups,
  getMyInvitations,
  getGroupDetail,
  createGroup as createGroupAction,
  inviteToGroup as inviteAction,
  respondToInvitation as respondAction,
  startGroupSession as startSessionAction,
  submitSessionResult as submitResultAction,
  endGroupSession as endSessionAction,
  getActiveSession,
  getSessionResults,
  leaveGroup as leaveGroupAction,
  removeFromGroup as removeAction,
  searchUsersForInvite as searchAction,
  type GroupInfo,
  type InvitationInfo,
  type SessionInfo,
  type SessionResultInfo,
  type BoardMemberStats,
  type BoardSessionDetail,
} from "../../app/actions/groups";

export type {
  GroupInfo,
  SessionInfo,
  BoardMemberStats,
  BoardSessionDetail,
};

interface GroupDetail {
  group: GroupInfo;
  sessions: BoardSessionDetail[];
  board: BoardMemberStats[];
}

export interface ActiveGroupSession {
  session: SessionInfo;
  group: GroupInfo;
  joinedAt: number;
}

interface GroupStore {
  open: boolean;
  groups: GroupInfo[];
  invitations: InvitationInfo[];
  activeGroupId: string | null;
  groupDetail: GroupDetail | null;
  activeSession: SessionInfo | null;
  sessionResults: SessionResultInfo[];
  /** Set when the user joins a session — drives the main app UI */
  liveSession: ActiveGroupSession | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;

  setOpen: (open: boolean) => void;
  setActiveGroup: (groupId: string | null) => void;
  clearError: () => void;
  hydrate: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  loadGroupDetail: (groupId: string) => Promise<void>;
  refreshActiveSession: (groupId: string) => Promise<void>;
  createGroup: (name: string) => Promise<string>;
  inviteMember: (groupId: string, username: string) => Promise<void>;
  respondToInvitation: (id: number, accept: boolean) => Promise<void>;
  startSession: (
    groupId: string,
    questionId: number,
    durationSecs: number,
  ) => Promise<void>;
  submitResult: (
    sessionId: string,
    completed: boolean,
    timeSpentSecs: number,
    code?: string,
  ) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  loadSessionResults: (sessionId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  searchUsers: (
    query: string,
    groupId: string,
  ) => Promise<{ id: string; username: string; displayName: string }[]>;
  joinSession: (session: SessionInfo, group: GroupInfo) => void;
  exitSession: () => void;
}

let hydratePromise: Promise<void> | null = null;

export const useGroupStore = create<GroupStore>((setState, getState) => ({
  open: false,
  groups: [],
  invitations: [],
  activeGroupId: null,
  groupDetail: null,
  activeSession: null,
  sessionResults: [],
  liveSession: null,
  loading: false,
  detailLoading: false,
  error: null,

  setOpen: (open) => setState({ open }),
  clearError: () => setState({ error: null }),

  joinSession: (session, group) => {
    setState({
      liveSession: { session, group, joinedAt: Date.now() },
      open: false,
    });
  },

  exitSession: () => {
    setState({ liveSession: null });
  },

  setActiveGroup: (groupId) => {
    setState({ activeGroupId: groupId, groupDetail: null, activeSession: null, sessionResults: [] });
    if (groupId) {
      getState().loadGroupDetail(groupId);
      getState().refreshActiveSession(groupId);
    }
  },

  hydrate: async () => {
    if (hydratePromise) return hydratePromise;

    hydratePromise = (async () => {
      setState({ loading: true });
      try {
        const [groups, invitations] = await Promise.all([
          getMyGroups(),
          getMyInvitations(),
        ]);
        setState({ groups, invitations, loading: false });
      } catch {
        setState({ groups: [], invitations: [], loading: false });
      }
      hydratePromise = null;
    })();

    return hydratePromise;
  },

  refreshGroups: async () => {
    try {
      const groups = await getMyGroups();
      setState({ groups });
    } catch { /* ignore */ }
  },

  refreshInvitations: async () => {
    try {
      const invitations = await getMyInvitations();
      setState({ invitations });
    } catch { /* ignore */ }
  },

  loadGroupDetail: async (groupId) => {
    setState({ detailLoading: true });
    try {
      const detail = await getGroupDetail(groupId);
      if (detail) {
        setState({ groupDetail: detail, detailLoading: false });
      } else {
        setState({ groupDetail: null, detailLoading: false });
      }
    } catch {
      setState({ groupDetail: null, detailLoading: false });
    }
  },

  refreshActiveSession: async (groupId) => {
    try {
      const session = await getActiveSession(groupId);
      setState({ activeSession: session });
      if (session) {
        const results = await getSessionResults(session.id);
        setState({ sessionResults: results });
      }
    } catch { /* ignore */ }
  },

  createGroup: async (name) => {
    try {
      const id = await createGroupAction(name);
      await getState().refreshGroups();
      return id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create group";
      setState({ error: msg });
      throw e;
    }
  },

  inviteMember: async (groupId, username) => {
    try {
      await inviteAction(groupId, username);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to invite";
      setState({ error: msg });
      throw e;
    }
  },

  respondToInvitation: async (id, accept) => {
    try {
      await respondAction(id, accept);
      await Promise.all([
        getState().refreshInvitations(),
        getState().refreshGroups(),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to respond";
      setState({ error: msg });
      throw e;
    }
  },

  startSession: async (groupId, questionId, durationSecs) => {
    try {
      await startSessionAction(groupId, questionId, durationSecs);
      await getState().refreshActiveSession(groupId);
      await getState().loadGroupDetail(groupId);
      const { activeSession, groupDetail } = getState();
      if (activeSession && groupDetail) {
        getState().joinSession(activeSession, groupDetail.group);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start session";
      setState({ error: msg });
      throw e;
    }
  },

  submitResult: async (sessionId, completed, timeSpentSecs, code) => {
    try {
      await submitResultAction(sessionId, completed, timeSpentSecs, code);
      const { activeGroupId } = getState();
      if (activeGroupId) {
        await getState().refreshActiveSession(activeGroupId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to submit";
      setState({ error: msg });
      throw e;
    }
  },

  endSession: async (sessionId) => {
    try {
      await endSessionAction(sessionId);
      setState({ liveSession: null });
      const { activeGroupId } = getState();
      if (activeGroupId) {
        await getState().refreshActiveSession(activeGroupId);
        await getState().loadGroupDetail(activeGroupId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to end session";
      setState({ error: msg });
      throw e;
    }
  },

  loadSessionResults: async (sessionId) => {
    try {
      const results = await getSessionResults(sessionId);
      setState({ sessionResults: results });
    } catch { /* ignore */ }
  },

  leaveGroup: async (groupId) => {
    try {
      await leaveGroupAction(groupId);
      setState({ activeGroupId: null, groupDetail: null });
      await getState().refreshGroups();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to leave group";
      setState({ error: msg });
      throw e;
    }
  },

  removeMember: async (groupId, userId) => {
    try {
      await removeAction(groupId, userId);
      await getState().loadGroupDetail(groupId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to remove member";
      setState({ error: msg });
      throw e;
    }
  },

  searchUsers: async (query, groupId) => {
    return searchAction(query, groupId);
  },
}));
