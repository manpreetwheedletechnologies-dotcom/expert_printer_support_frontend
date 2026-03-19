// src/lib/constants.js
// ─────────────────────────────────────────────────────────────────────────────
// Central config — all components import from here
// ─────────────────────────────────────────────────────────────────────────────

export const API_BASE    = "http://localhost:5000";   // ← your Node backend port
export const API_ENABLED = true;

export const ROLES = { ADMIN: "admin", AGENT: "agent" };

// ── Fallback users (used if API is down) ────────────────────────────────────
export const FALLBACK_USERS = [
  { email: "admin@yoursite.com",  password: "Admin@12345", name: "Super Admin",    initials: "SA", role: "admin" },
  { email: "agent1@support.com",  password: "Agent@12345", name: "Support Agent 1",initials: "A1", role: "agent" },
];

// ── Nav items per role ───────────────────────────────────────────────────────
export const ADMIN_NAV = [
  { label: "Dashboard",       icon: "grid"  },
  { label: "Live Chats",      icon: "chat"  },
  { label: "Leads",           icon: "list"  },
  { label: "Website Content", icon: "globe" },
  { label: "Agents",          icon: "users" },
];

export const AGENT_NAV = [
  { label: "Dashboard",  icon: "grid" },
  { label: "Live Chats", icon: "chat" },
  { label: "Leads",      icon: "list" },
];

// ── Fallback stat cards (shown while API loads) ──────────────────────────────
export const ADMIN_FALLBACK_STATS = [
  { label: "Total Leads",     value: "—", change: "Loading...", positive: true,  icon: "list",        accent: "bg-blue-50 text-blue-500"      },
  { label: "Active Chats",    value: "—", change: "Loading...", positive: true,  icon: "chat",        accent: "bg-orange-50 text-orange-500"  },
  { label: "Resolved Issues", value: "—", change: "Loading...", positive: true,  icon: "checkCircle", accent: "bg-emerald-50 text-emerald-500" },
  { label: "Total Agents",    value: "—", change: "Loading...", positive: true,  icon: "users",       accent: "bg-purple-50 text-purple-500"  },
];

export const AGENT_FALLBACK_STATS = [
  { label: "My Leads",       value: "—", change: "Loading...", positive: true,  icon: "list",        accent: "bg-blue-50 text-blue-500"      },
  { label: "Active Chats",   value: "—", change: "Loading...", positive: true,  icon: "chat",        accent: "bg-orange-50 text-orange-500"  },
  { label: "Resolved Today", value: "—", change: "Loading...", positive: true,  icon: "checkCircle", accent: "bg-emerald-50 text-emerald-500" },
  { label: "Avg. Response",  value: "—", change: "Loading...", positive: true,  icon: "clock",       accent: "bg-indigo-50 text-indigo-500"  },
];

// ── Chart fallback data ──────────────────────────────────────────────────────
export const FALLBACK_AREA_DATA = [
  { day: "Mon", leads: 0, resolved: 0 },
  { day: "Tue", leads: 0, resolved: 0 },
  { day: "Wed", leads: 0, resolved: 0 },
  { day: "Thu", leads: 0, resolved: 0 },
  { day: "Fri", leads: 0, resolved: 0 },
  { day: "Sat", leads: 0, resolved: 0 },
  { day: "Sun", leads: 0, resolved: 0 },
];

export const FALLBACK_BAR_DATA = [...FALLBACK_AREA_DATA];

// ── Fallback leads (shown if API is down) ────────────────────────────────────
export const FALLBACK_ALL_LEADS = [];

// ── Fallback agents ──────────────────────────────────────────────────────────
export const FALLBACK_AGENTS = [];

// ── Fallback chats ───────────────────────────────────────────────────────────
export const FALLBACK_CHATS = [];

// ── Status badge styles ──────────────────────────────────────────────────────
export const STATUS_STYLES = {
  new:         "bg-gray-900 text-white",
  New:         "bg-gray-900 text-white",
  contacted:   "bg-amber-50 text-amber-600 border border-amber-200",
  Contacted:   "bg-amber-50 text-amber-600 border border-amber-200",
  Connected:   "bg-white text-gray-700 border border-gray-300",
  in_progress: "bg-blue-50 text-blue-600 border border-blue-200",
  resolved:    "bg-emerald-50 text-emerald-600 border border-emerald-100",
  Resolved:    "bg-emerald-50 text-emerald-600 border border-emerald-100",
  closed:      "bg-gray-100 text-gray-500",
};

export const CHAT_STATUS_STYLES = {
  active:  "bg-blue-50 text-blue-600 border border-blue-100",
  Open:    "bg-blue-50 text-blue-600 border border-blue-100",
  waiting: "bg-amber-50 text-amber-600 border border-amber-200",
  Pending: "bg-amber-50 text-amber-600 border border-amber-200",
  closed:  "bg-gray-100 text-gray-500",
  Closed:  "bg-gray-100 text-gray-500",
};

export const AGENT_ONLINE_STYLES = {
  Online:  "bg-emerald-400",
  Busy:    "bg-amber-400",
  Offline: "bg-gray-300",
};