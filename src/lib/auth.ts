"use client";

export type AdminSession = {
  id: string;
  name: string;
  allowed_tabs?: string[];
  loggedInAt: string;
};

const SESSION_KEY = "edb_admin_session";

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      const session = JSON.parse(data);
      // Auto-migrate legacy sessions: If they had access to Settings, give them access to CS Forms
      if (session.allowed_tabs && session.allowed_tabs.includes('/settings') && !session.allowed_tabs.includes('/cs-forms')) {
        session.allowed_tabs.push('/cs-forms');
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
      return session;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function setAdminSession(admin: { id: string; name: string; allowed_tabs?: string[] }): AdminSession {
  const session: AdminSession = {
    id: admin.id,
    name: admin.name,
    allowed_tabs: admin.allowed_tabs || ['/', '/entrepreneurs', '/cs-forms', '/settings'],
    loggedInAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearAdminSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}
