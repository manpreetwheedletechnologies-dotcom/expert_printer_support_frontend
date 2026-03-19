// src/hooks/useAgentNotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Always-on Socket.IO connection for agents.
// Receives new chat alerts, lead notifications, queue updates.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "../lib/constants";
import { getToken } from "../lib/api";

export function useAgentNotifications({ userId, enabled = true }) {
  const socketRef                             = useRef(null);
  const [pendingChats,  setPendingChats]      = useState([]);
  const [newLeads,      setNewLeads]          = useState([]);
  const [queueCount,    setQueueCount]        = useState(0);

  useEffect(() => {
    if (!userId || !enabled) return;

    const token = getToken();
    socketRef.current = io(API_BASE, {
      withCredentials: true,
      auth: token ? { token } : {},
    });

    const socket = socketRef.current;

    // ── New chat assigned directly to this agent ────────────────────────────
    socket.on("new_chat_assigned", (chat) => {
      setPendingChats((prev) => {
        if (prev.find((c) => c.roomId === chat.roomId)) return prev;
        return [...prev, chat];
      });
    });

    // ── Queue updates (someone waiting, accepted, closed) ───────────────────
    socket.on("chat_queue_update", (data) => {
      if (data.action === "waiting") {
        setPendingChats((prev) => {
          if (prev.find((c) => c.roomId === data.roomId)) return prev;
          return [...prev, { roomId: data.roomId, visitor: data.visitor, status: "waiting" }];
        });
        setQueueCount((n) => n + 1);
      }
      if (data.action === "accepted" || data.action === "closed") {
        setPendingChats((prev) => prev.filter((c) => c.roomId !== data.roomId));
        setQueueCount((n) => Math.max(0, n - 1));
      }
    });

    // ── Visitor sends a message (unread notification) ───────────────────────
    socket.on("visitor_message_notification", (data) => {
      setPendingChats((prev) =>
        prev.map((c) =>
          c.roomId === data.roomId ? { ...c, unread: (c.unread || 0) + 1 } : c
        )
      );
    });

    // ── New lead submitted via contact form ─────────────────────────────────
    socket.on("new_lead", (lead) => {
      setNewLeads((prev) => {
        if (prev.find((l) => l.id === lead.id)) return prev;
        return [lead, ...prev].slice(0, 20); // keep last 20 only
      });
    });

    // ── Lead updated by someone else ────────────────────────────────────────
    socket.on("lead_updated", (data) => {
      setNewLeads((prev) =>
        prev.map((l) => (l.id === data.id ? { ...l, status: data.status } : l))
      );
    });

    return () => socket.disconnect();
  }, [userId, enabled]);

  const dismissChat = (roomId) =>
    setPendingChats((prev) => prev.filter((c) => c.roomId !== roomId));

  const dismissLead = (id) =>
    setNewLeads((prev) => prev.filter((l) => l.id !== id));

  const clearAllChats = () => setPendingChats([]);
  const clearAllLeads = () => setNewLeads([]);

  return {
    pendingChats,
    newLeads,
    queueCount,
    dismissChat,
    dismissLead,
    clearAllChats,
    clearAllLeads,
    // Backwards compat with old hook API
    dismiss:  dismissChat,
    clearAll: clearAllChats,
  };
}