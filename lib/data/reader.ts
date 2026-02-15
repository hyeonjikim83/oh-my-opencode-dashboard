import Database from "better-sqlite3";
import { existsSync } from "fs";
import { DB_PATH } from "@/lib/constants";
import type { RawSession, RawMessage } from "@/lib/types";

interface SessionRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  slug: string;
  directory: string;
  title: string;
  version: string;
  summary_additions: number | null;
  summary_deletions: number | null;
  summary_files: number | null;
  time_created: number;
  time_updated: number;
}

interface MessageRow {
  id: string;
  session_id: string;
  data: string;
}

function getDb(): Database.Database | null {
  if (!existsSync(DB_PATH)) return null;
  return new Database(DB_PATH, { readonly: true });
}

function sessionRowToRaw(row: SessionRow): RawSession {
  return {
    id: row.id,
    slug: row.slug,
    version: row.version,
    projectID: row.project_id,
    directory: row.directory,
    parentID: row.parent_id ?? undefined,
    title: row.title,
    time: {
      created: row.time_created,
      updated: row.time_updated,
    },
    summary:
      row.summary_additions != null
        ? {
            additions: row.summary_additions,
            deletions: row.summary_deletions ?? 0,
            files: row.summary_files ?? 0,
          }
        : undefined,
  };
}

function messageRowToRaw(row: MessageRow): RawMessage {
  const data = JSON.parse(row.data) as Omit<RawMessage, "id" | "sessionID">;
  return {
    ...data,
    id: row.id,
    sessionID: row.session_id,
  };
}

export async function readAllSessions(): Promise<RawSession[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = db
      .prepare("SELECT * FROM session ORDER BY time_created DESC")
      .all() as SessionRow[];
    return rows.map(sessionRowToRaw);
  } finally {
    db.close();
  }
}

export async function readMessagesForSession(
  sessionId: string,
): Promise<RawMessage[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = db
      .prepare(
        "SELECT id, session_id, data FROM message WHERE session_id = ? ORDER BY time_created ASC",
      )
      .all(sessionId) as MessageRow[];
    return rows.map(messageRowToRaw);
  } finally {
    db.close();
  }
}

export async function readMessagesForSessionTree(
  sessionId: string,
): Promise<RawMessage[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const childIds = db
      .prepare("SELECT id FROM session WHERE parent_id = ?")
      .all(sessionId) as { id: string }[];

    const allSessionIds = [sessionId, ...childIds.map((r) => r.id)];
    const placeholders = allSessionIds.map(() => "?").join(",");

    const rows = db
      .prepare(
        `SELECT id, session_id, data FROM message WHERE session_id IN (${placeholders}) ORDER BY time_created ASC`,
      )
      .all(...allSessionIds) as MessageRow[];
    return rows.map(messageRowToRaw);
  } finally {
    db.close();
  }
}

export async function readChildSessions(
  parentId: string,
): Promise<RawSession[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = db
      .prepare("SELECT * FROM session WHERE parent_id = ? ORDER BY time_created ASC")
      .all(parentId) as SessionRow[];
    return rows.map(sessionRowToRaw);
  } finally {
    db.close();
  }
}

export async function readAllMessages(): Promise<RawMessage[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = db
      .prepare(
        "SELECT id, session_id, data FROM message ORDER BY time_created ASC",
      )
      .all() as MessageRow[];
    return rows.map(messageRowToRaw);
  } finally {
    db.close();
  }
}
