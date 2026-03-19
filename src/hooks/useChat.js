// src/hooks/useChat.js
// ─────────────────────────────────────────────────────────────────────────────
// Real-time chat hook using Socket.IO (matches the Node.js backend)
// Used by: AgentDashboard, AdminDashboard (live chat panel)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "../lib/constants";
import { getToken } from "../lib/api";

export function useChat({ roomId, userId, role }) {
  const socketRef                       = useRef(null);
  const [messages,   setMessages]       = useState([]);
  const [connected,  setConnected]      = useState(false);
  const [chatStatus, setChatStatus]     = useState("waiting");
  const [typingInfo, setTypingInfo]     = useState({ isTyping: false, sender: null });

  useEffect(() => {
    if (!roomId) return;

    // Connect to Socket.IO with JWT token (agents/admins only)
    const token = getToken();
    socketRef.current = io(API_BASE, {
      withCredentials: true,
      auth: token ? { token } : {},
    });

    const socket = socketRef.current;

    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Join the specific chat room
    socket.emit("join_chat", { roomId, visitorName: role === "agent" ? "Agent" : "Visitor" });

    // Receive full message history on join
    socket.on("chat_history", (history) => {
      setMessages(history.map((m) => ({
        id:   m._id || Date.now(),
        from: m.sender,
        text: m.text,
        time: m.createdAt,
      })));
    });

    // Receive a new message in real time
    socket.on("receive_message", (msg) => {
      setMessages((prev) => [
        ...prev,
        { id: msg._id || Date.now(), from: msg.sender, text: msg.text, time: msg.createdAt },
      ]);
    });

    // Agent joined the chat
    socket.on("agent_connected", (data) => {
      setChatStatus("active");
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), from: "system", text: data.message || "Agent has joined the chat." },
      ]);
    });

    // Chat was closed
    socket.on("chat_closed", () => {
      setChatStatus("closed");
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), from: "system", text: "This chat has been closed." },
      ]);
    });

    // Typing indicator
    socket.on("typing_indicator", ({ sender, isTyping }) => {
      setTypingInfo({ sender, isTyping });
    });

    // Read receipts
    socket.on("messages_read", () => {
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, role]);

  // Send a message
  const sendMessage = useCallback((text) => {
    if (!socketRef.current?.connected || !text.trim()) return;
    socketRef.current.emit("send_message", {
      roomId,
      text:     text.trim(),
      sender:   role,
      senderId: userId,
    });
  }, [roomId, role, userId]);

  // Typing indicators
  const startTyping = useCallback(() => {
    socketRef.current?.emit("typing_start", { roomId, sender: role });
  }, [roomId, role]);

  const stopTyping = useCallback(() => {
    socketRef.current?.emit("typing_stop", { roomId, sender: role });
  }, [roomId, role]);

  // Mark messages as read
  const markRead = useCallback(() => {
    socketRef.current?.emit("mark_read", { roomId });
  }, [roomId]);

  // Accept a waiting chat (agent only)
  const acceptChat = useCallback(() => {
    socketRef.current?.emit("accept_chat", { roomId });
  }, [roomId]);

  return {
    messages,
    connected,
    chatStatus,
    typingInfo,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
    acceptChat,
  };
}