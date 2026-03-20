// src/components/dashboard/agent/AgentDashboard.jsx 

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { io } from "socket.io-client";
import DashboardLayout from "../DashboardLayout";
import { Skeleton } from "../Shared";
import Icon from "../Icon";
import { apiFetch, AuthError, getUser, getToken } from "../../../lib/api";
import { AGENT_NAV, STATUS_STYLES, API_BASE } from "../../../lib/constants";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()}\n${d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`;
}

function normaliseChat(c) {
  return {
    ...c,
    id:       c._id  || c.id,
    roomId:   c.roomId,
    customer: c.visitor?.name  || c.customer || "Visitor",
    email:    c.visitor?.email || c.email    || "",
    phone:    c.visitor?.phone || c.phone    || "",
    printer:  c.queryContext
      ? `${c.queryContext.printerBrand||""} ${c.queryContext.printerModel||""}`.trim()
      : c.printer || "",
    issue:    c.queryContext?.initialMessage || c.issue || "",
    status:   c.status || "waiting",
  };
}

function normaliseLead(l) {
  return {
    ...l,
    id:       l._id  || l.id,
    customer: l.name || l.customer || "",
    printer:  l.printerBrand
      ? `${l.printerBrand} ${l.printerModel||""}`.trim()
      : l.printer || "",
    issue:    l.message || l.issue || "",
  };
}

function buildStatCards(raw) {
  return [
    { label:"My Leads",       value:String(raw.my_leads??0),       change:"Assigned to you",  positive:true, icon:"list",        accent:"bg-blue-50 text-blue-500"      },
    { label:"Active Chats",   value:String(raw.active_chats??0),   change:"Currently open",   positive:true, icon:"chat",        accent:"bg-orange-50 text-orange-500"  },
    { label:"Resolved Today", value:String(raw.resolved_today??0), change:"Today",            positive:true, icon:"checkCircle", accent:"bg-emerald-50 text-emerald-500" },
    { label:"Avg. Response",  value:raw.avg_response??"—",         change:"Target: under 5m", positive:true, icon:"clock",       accent:"bg-indigo-50 text-indigo-500"  },
  ];
}

const STATUS_OPTIONS = ["new","contacted","in_progress","resolved","closed"];
const STATUS_LABEL   = { new:"New", contacted:"Contacted", in_progress:"In Progress", resolved:"Resolved", closed:"Closed" };
const STATUS_STYLE   = {
  new:         "bg-gray-900 text-white border-0",
  contacted:   "bg-amber-50 text-amber-700 border border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200",
  resolved:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  closed:      "bg-gray-100 text-gray-500 border border-gray-200",
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, change, positive, icon, accent, loading }) {
  if (loading) return (
    <div className="bg-white rounded-2xl p-5 flex-1 border border-gray-100 shadow-sm min-w-0 space-y-3">
      <Skeleton cls="h-3 w-24"/><Skeleton cls="h-8 w-20"/><Skeleton cls="h-3 w-32"/>
    </div>
  );
  return (
    <div className="bg-white rounded-2xl p-5 flex-1 border border-gray-100 shadow-sm min-w-0">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon name={icon} cls="w-5 h-5"/>
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
      <p className={`text-xs font-medium ${positive?"text-emerald-500":"text-red-400"}`}>
        {positive?"↑":"↓"} {change}
      </p>
    </div>
  );
}

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef          = useRef(null);

  const handleOpen = (e) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative inline-block">
      <button ref={btnRef} onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer ${STATUS_STYLE[status]||STATUS_STYLE.new}`}>
        {STATUS_LABEL[status]||status}<Icon name="chevron" cls="w-3 h-3"/>
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)}/>
          <div
            className="absolute bg-white border border-gray-200 rounded-xl shadow-2xl py-1 min-w-[150px]"
            style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
          >
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                className="w-full text-left text-xs px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  s==="new"?"bg-gray-800":s==="contacted"?"bg-amber-400":s==="in_progress"?"bg-blue-400":s==="resolved"?"bg-emerald-400":"bg-gray-300"
                }`}/>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── CHAT REQUEST CARD ────────────────────────────────────────────────────────
// Shows status: pending / accepted / declined
function ChatRequestCard({ req, onAccept, onDecline, accepting }) {
  const status = req.cardStatus || "pending"; // "pending" | "accepted" | "declined"

  const statusConfig = {
    pending:  { bar:"from-blue-400 to-blue-600",   badge:"bg-amber-50 text-amber-600 border-amber-200",   label:"Waiting"  },
    accepted: { bar:"from-emerald-400 to-emerald-600", badge:"bg-emerald-50 text-emerald-700 border-emerald-200", label:"Accepted" },
    declined: { bar:"from-gray-300 to-gray-400",   badge:"bg-gray-100 text-gray-500 border-gray-200",    label:"Declined" },
  };
  const cfg = statusConfig[status];

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-opacity ${status==="declined"?"opacity-60 border-gray-100":"border-blue-100"}`}>
      {/* Top color bar */}
      <div className={`h-1 bg-gradient-to-r ${cfg.bar}`}/>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              status==="accepted"?"bg-emerald-50":status==="declined"?"bg-gray-50":"bg-blue-50"
            }`}>
              <span className={`font-bold text-base ${
                status==="accepted"?"text-emerald-500":status==="declined"?"text-gray-400":"text-blue-500"
              }`}>
                {(req.customer||req.visitor?.name||"V")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {req.customer || req.visitor?.name || "Visitor"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(req.timestamp||req.createdAt||Date.now())
                  .toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`text-xs border px-2.5 py-1 rounded-full font-semibold ${cfg.badge}`}>
            {status==="accepted" ? "✓ Accepted" : status==="declined" ? "✕ Declined" : "● Waiting"}
          </span>
        </div>

        {/* Info */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5">
          {(req.email||req.visitor?.email) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase w-14 font-medium">Email</span>
              <span className="text-xs text-gray-700 truncate">{req.email||req.visitor?.email}</span>
            </div>
          )}
          {(req.phone||req.visitor?.phone) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase w-14 font-medium">Phone</span>
              <span className="text-xs text-gray-700">{req.phone||req.visitor?.phone}</span>
            </div>
          )}
          {req.printer && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase w-14 font-medium">Printer</span>
              <span className="text-xs text-gray-700 font-medium">{req.printer}</span>
            </div>
          )}
          {req.issue && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-gray-400 uppercase w-14 font-medium mt-0.5">Issue</span>
              <span className="text-xs text-blue-600 font-medium">{req.issue}</span>
            </div>
          )}
        </div>

        {/* Action buttons — only shown while pending */}
        {status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => onDecline(req.roomId)}
              disabled={accepting === req.roomId}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Decline
            </button>
            <button
              onClick={() => onAccept(req)}
              disabled={accepting === req.roomId}
              className="flex-1 py-2.5 bg-blue-500 rounded-xl text-sm font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-60"
            >
              {accepting === req.roomId ? "Accepting…" : "✓ Accept"}
            </button>
          </div>
        )}

        {/* Accepted state */}
        {status === "accepted" && (
          <div className="flex items-center justify-center gap-2 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-emerald-600 text-sm font-semibold">You accepted this chat</span>
          </div>
        )}

        {/* Declined state */}
        {status === "declined" && (
          <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 text-sm">Declined — passed to other agents</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD OVERVIEW ───────────────────────────────────────────────────────
function DashboardView({ stats, leads, loading, loadingLeads, loadingRequests, incomingRequests, onAccept, onDecline, accepting }) {
  return (
    <>
      {/* Stat cards */}
      <div className="flex gap-4 mb-6">
        {loading
          ? [1,2,3,4].map(i=><StatCard key={i} loading/>)
          : stats.map(s=><StatCard key={s.label} {...s} loading={false}/>)
        }
      </div>

      {/* ── INCOMING CHAT REQUESTS ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Incoming Chat Requests</h3>
            {incomingRequests.filter(r => r.cardStatus === "pending").length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {incomingRequests.filter(r => r.cardStatus === "pending").length}
              </span>
            )}
          </div>
          {!loadingRequests && incomingRequests.filter(r => r.cardStatus === "pending").length > 0 && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
              ● {incomingRequests.filter(r => r.cardStatus === "pending").length} waiting for agent
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loadingRequests ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton cls="w-10 h-10 rounded-xl"/>
                  <div className="flex-1 space-y-2"><Skeleton cls="h-3 w-32"/><Skeleton cls="h-3 w-20"/></div>
                </div>
                <Skeleton cls="h-16 w-full rounded-xl"/>
                <div className="flex gap-2"><Skeleton cls="h-10 flex-1 rounded-xl"/><Skeleton cls="h-10 flex-1 rounded-xl"/></div>
              </div>
            ))}
          </div>
        ) : incomingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Icon name="chat" cls="w-6 h-6 text-gray-300"/>
            </div>
            <p className="text-sm text-gray-400">No pending chat requests</p>
            <p className="text-xs text-gray-300 mt-1">New requests will appear here in real time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {incomingRequests.map(req => (
              <ChatRequestCard
                key={req.roomId}
                req={req}
                onAccept={onAccept}
                onDecline={onDecline}
                accepting={accepting === req.roomId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">My Recent Leads</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["ID","Customer","Email","Printer","Issue","Status","Created"].map(h=>(
                <th key={h} className="text-left text-xs font-medium text-gray-400 px-5 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingLeads
              ? [1,2,3].map(i=><tr key={i}>{[1,2,3,4,5,6,7].map(j=><td key={j} className="px-5 py-4"><Skeleton cls="h-3 w-full"/></td>)}</tr>)
              : leads.length===0
                ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No leads yet.</td></tr>
                : leads.slice(0,5).map((lead,i,arr)=>(
                  <tr key={lead.id} className={`hover:bg-gray-50 ${i<arr.length-1?"border-b border-gray-100":""}`}>
                    <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{lead.id?.slice(-6)}</td>
                    <td className="px-5 py-3.5 text-xs font-medium text-gray-800 whitespace-nowrap">{lead.customer}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{lead.email||"—"}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">{lead.printer||"—"}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 min-w-[200px]"><span className="block whitespace-normal">{lead.issue||"—"}</span></td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[lead.status]||"bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[lead.status]||lead.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-pre-line">{fmtDate(lead.createdAt||lead.created_at)}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── LIVE CHAT WINDOW ─────────────────────────────────────────────────────────
function LiveChatWindow({ chat, onResolve, currentUser, initialVisitorOnline = false, onVisitorStatusChange }) {
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [connected,      setConnected]      = useState(false);
  const [visitorTyping,  setVisitorTyping]  = useState(false);
  const [visitorOnline,  setVisitorOnline]  = useState(initialVisitorOnline);
  const [adminInChat,    setAdminInChat]    = useState(false);
  const [adminRequested, setAdminRequested] = useState(false);
  const [chatClosed,     setChatClosed]     = useState(chat?.status==="closed");
  const bottomRef      = useRef(null);
  const socketRef      = useRef(null);

  // Sync visitorOnline when switching between chats
  useEffect(() => {
    setVisitorOnline(initialVisitorOnline);
  }, [chat?.roomId, initialVisitorOnline]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,visitorTyping]);

  useEffect(()=>{
    if (!chat?.roomId) return;
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(API_BASE,{withCredentials:true,auth:{token:getToken()}});
    socketRef.current = socket;

    // IMPORTANT: Clear previous messages when switching rooms
    setMessages([]);
    setConnected(false);
    setVisitorTyping(false);
    setChatClosed(chat?.status === "closed");

    socket.on("connect",()=>{
      setConnected(true);
      socket.emit("join_chat",{roomId:chat.roomId,visitorName:"Agent"});
    });
    socket.on("disconnect",()=>setConnected(false));
    socket.on("chat_history",(h)=>{
      if(!h?.length) return;
      setMessages(h.map(m=>({id:m._id||Date.now(),from:m.sender,text:m.text,time:m.createdAt})));
    });
    socket.on("receive_message",(msg)=>{
      if(msg.sender==="agent"&&msg.senderId===(currentUser?._id||currentUser?.id)) return;
      setMessages(prev=>[...prev,{id:msg._id||Date.now(),from:msg.sender,text:msg.text,time:msg.createdAt}]);
    });
    socket.on("typing_indicator",({sender,isTyping})=>{ if(sender==="visitor") setVisitorTyping(isTyping); });
    socket.on("admin_joined",(d)=>{ setAdminInChat(true); setAdminRequested(false); setMessages(prev=>[...prev,{id:Date.now(),from:"system",text:d.message||"Admin has joined."}]); });
    socket.on("admin_declined",(d)=>{ setAdminRequested(false); setMessages(prev=>[...prev,{id:Date.now(),from:"system",text:d.message||"Admin unavailable."}]); });
    socket.on("chat_closed",()=>{ setChatClosed(true); setVisitorOnline(false); setMessages(prev=>[...prev,{id:Date.now(),from:"system",text:"Chat closed."}]); });
    socket.on("visitor_disconnected",()=>{ setChatClosed(true); setVisitorOnline(false); setMessages(prev=>[...prev,{id:Date.now(),from:"system",text:"Visitor has left the chat."}]); });

    // Real-time visitor online/offline — updates chat header AND sidebar dot
    socket.on("visitor_status",({roomId, online})=>{
      if (roomId !== chat.roomId) return;
      setVisitorOnline(online);
      // Propagate to LiveChatsView so sidebar dot updates too
      onVisitorStatusChange?.(roomId, online);
      if (!online) {
        setMessages(prev=>[...prev,{id:Date.now(),from:"system",text:"Visitor went offline."}]);
      } else {
        setMessages(prev=>[...prev,{id:Date.now(),from:"system",text:"Visitor is back online."}]);
      }
    });

    return ()=>{ socket.disconnect(); socketRef.current=null; };
  },[chat?.roomId]);

  const send = ()=>{
    if(!input.trim()||chatClosed||!socketRef.current?.connected) return;
    const text=input.trim(); setInput("");
    setMessages(prev=>[...prev,{id:Date.now(),from:"agent",text,time:new Date()}]);
    socketRef.current.emit("send_message",{roomId:chat.roomId,text,sender:"agent",senderId:currentUser?._id||currentUser?.id});
  };

  const requestAdmin = ()=>{
    if(!socketRef.current?.connected) return;
    setAdminRequested(true);
    socketRef.current.emit("request_admin",{roomId:chat.roomId});
    setMessages(prev=>[...prev,{id:Date.now(),from:"system",text:"Admin notified."}]);
  };

  const handleResolve = async()=>{
    setChatClosed(true); onResolve?.(chat.id);
    try{ await apiFetch(`/api/agent/chats/${chat.id}/resolve`,{method:"POST"}); }catch{}
  };

  if (!chat) return (
    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><Icon name="chat" cls="w-8 h-8 text-gray-300"/></div>
        <p className="text-sm text-gray-400">Accept a request to start chatting</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold text-gray-900">{chat.customer}</p>
            {/* Visitor online/offline badge only — no redundant Live dot */}
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
              visitorOnline
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-gray-100 text-gray-400 border-gray-200"
            }`}>
              {/* <span className={`w-1.5 h-1.5 rounded-full ${visitorOnline?"bg-blue-500 animate-pulse":"bg-gray-400"}`}/>
              {visitorOnline ? "Visitor Online" : "Visitor Offline"} */}
            </span>
            {adminInChat&&<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin In Chat</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{chat.printer||"—"} · {chat.email||"—"}</p>
          {chat.issue&&<p className="text-xs text-blue-500 mt-1 font-medium">{chat.issue}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!chatClosed&&!adminInChat&&(
            <button onClick={requestAdmin} disabled={adminRequested}
              className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${adminRequested?"border-purple-200 bg-purple-50 text-purple-400 cursor-not-allowed":"border-purple-300 text-purple-600 hover:bg-purple-50"}`}>
              {adminRequested?"⏳ Notified":"👤 Request Admin"}
            </button>
          )}
          {!chatClosed&&(
            <button onClick={handleResolve} className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors">
              ✓ Resolved
            </button>
          )}
          {chatClosed&&<span className="border border-gray-200 text-gray-400 text-sm px-4 py-2 rounded-xl">Resolved</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-gray-50/30">
        {messages.length===0&&<div className="text-center text-xs text-gray-400 py-10">Chat started. Say hello!</div>}
        {messages.map((m,idx)=>{
          if(m.from==="system"||m.from==="divider") return(
            <div key={m.id||idx} className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200"/>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{m.text}</span>
              <div className="flex-1 h-px bg-gray-200"/>
            </div>
          );
          if(m.from==="visitor"||m.from==="customer") return(
            <div key={m.id||idx} className="flex flex-col items-start">
              <p className="text-xs text-blue-500 font-semibold mb-1">{chat.customer}</p>
              <div className="bg-blue-500 text-white text-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm leading-relaxed">{m.text}</div>
            </div>
          );
          if(m.from==="admin") return(
            <div key={m.id||idx} className="flex flex-col items-end">
              <p className="text-xs text-purple-500 font-semibold mb-1 text-right">{m.senderName || "Admin"}</p>
              <div className="bg-purple-500 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm leading-relaxed">{m.text}</div>
            </div>
          );
          if(m.from==="bot") return(
            <div key={m.id||idx} className="flex flex-col items-start">
              <p className="text-xs text-gray-400 mb-1">Atlas Bot</p>
              <div className="bg-gray-100 text-gray-700 text-sm rounded-2xl px-4 py-3 max-w-sm">{m.text}</div>
            </div>
          );
          return(
            <div key={m.id||idx} className="flex flex-col items-end">
              <p className="text-xs text-gray-400 mb-1 text-right">You</p>
              <div className="bg-white border border-gray-100 shadow-sm text-gray-700 text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm leading-relaxed">{m.text}</div>
            </div>
          );
        })}
        {visitorTyping&&(
          <div className="flex flex-col items-start">
            <p className="text-xs text-blue-500 font-semibold mb-1">{chat.customer}</p>
            <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl flex gap-1">
              {[0,0.2,0.4].map((d,i)=><span key={i} style={{animation:`pulse 1s ${d}s infinite`,opacity:0.5}}>.</span>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <div className={`flex items-center gap-3 border rounded-2xl px-4 py-3 transition-all ${chatClosed?"border-gray-100 bg-gray-50":"border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"}`}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
            disabled={chatClosed}
            className="flex-1 text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400 disabled:cursor-not-allowed"
            placeholder={chatClosed?"Chat is resolved.":"Type a message… (Enter to send)"}
          />
          <button onClick={send} disabled={chatClosed||!input.trim()} className="text-blue-500 hover:text-blue-600 disabled:text-gray-300 transition-colors">
            <Icon name="send" cls="w-5 h-5"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LIVE CHATS VIEW ──────────────────────────────────────────────────────────
function LiveChatsView({ user, incomingRequests, onAccept, onDecline, accepting, activeChat, setActiveChat }) {
  const currentUser  = user || getUser();
  const [chats,            setChats]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  // Map of roomId → true/false for sidebar dot indicator
  const [visitorOnlineMap, setVisitorOnlineMap] = useState({});
  const sidebarSocketRef = useRef(null);
  const pollingRef       = useRef(null);

  const fetchChats = useCallback(async()=>{
    try {
      const data = await apiFetch("/api/agent/chats");
      const normalised = (data.chats||[]).map(normaliseChat).filter(c=>c.status==="active"||c.status==="closed");
      setChats(normalised);
    } catch(err){
      if(err instanceof AuthError) clearInterval(pollingRef.current);
    } finally { setLoading(false); }
  },[]);

  useEffect(()=>{
    fetchChats();
    pollingRef.current = setInterval(fetchChats,8000);
    return ()=>clearInterval(pollingRef.current);
  },[fetchChats]);

  // Listen for visitor_status events to update sidebar dots
  useEffect(()=>{
    const token  = getToken();
    const socket = io(API_BASE,{withCredentials:true,auth:token?{token}:{}});
    sidebarSocketRef.current = socket;

    socket.on("visitor_status",({roomId, online})=>{
      setVisitorOnlineMap(prev=>({ ...prev, [roomId]: online }));
    });

    return ()=>socket.disconnect();
  },[]);

  const handleResolve = (chatId) => {
    // Update sidebar pill immediately
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, status: "closed" } : c));
    // Update the open chat window header too
    setActiveChat(prev => prev?.id === chatId ? { ...prev, status: "closed" } : prev);
  };

  const statusPill = {
    active: "bg-blue-500 text-white",
    closed: "border border-gray-200 text-gray-400 bg-white",
  };

  const pendingRequests = incomingRequests.filter(r => r.cardStatus === "pending");

  return (
    <div className="flex gap-4 h-[calc(100vh-148px)]">
      {/* Sidebar */}
      <div className="w-64 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-base font-bold text-gray-900">My Chats ({chats.length})</p>
          {pendingRequests.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pendingRequests.length} new
            </span>
          )}
        </div>

        {/* Pending requests — only show ones not yet acted on */}
        {pendingRequests.length > 0 && (
          <div className="border-b border-gray-100 bg-amber-50/50">
            {pendingRequests.map(req => (
              <div key={req.roomId} className="px-4 py-3 border-b border-amber-100 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {req.customer || req.visitor?.name || "Visitor"}
                  </p>
                  <span className="text-[10px] text-amber-600 font-medium">Waiting</span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{req.issue || req.printer || "—"}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onDecline(req.roomId)}
                    disabled={accepting === req.roomId}
                    className="flex-1 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40">
                    Decline
                  </button>
                  <button
                    onClick={() => onAccept(req)}
                    disabled={accepting === req.roomId}
                    className="flex-1 py-1 bg-blue-500 rounded-lg text-xs font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-60">
                    {accepting === req.roomId ? "…" : "Accept"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {loading
            ? [1,2,3].map(i=><div key={i} className="px-5 py-4 space-y-2"><Skeleton cls="h-3 w-24"/><Skeleton cls="h-3 w-16"/></div>)
            : chats.length===0
              ? <div className="px-5 py-8 text-center text-xs text-gray-400">No active chats yet.</div>
              : chats.map(c => (
                <div key={c.id} onClick={() => setActiveChat(c)}
                  className={`px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${activeChat?.id===c.id?"bg-blue-50/40 border-l-2 border-blue-400":""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Visitor online dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        visitorOnlineMap[c.roomId]
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}/>
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.customer}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ml-1 transition-all ${
                      c.status === "active"
                        ? "bg-blue-500 text-white"
                        : "border border-gray-200 text-gray-400 bg-white"
                    }`}>
                      {c.status === "active" ? "Active" : "Closed"}
                    </span>
                  </div>
                  {/* Visitor online label */}
                  <p className={`text-[10px] font-medium mb-0.5 ${
                    visitorOnlineMap[c.roomId] ? "text-green-500" : "text-gray-400"
                  }`}>
                    {/* {visitorOnlineMap[c.roomId] ? "● Online" : "● Offline"} */}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{c.printer||"—"}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.issue||"—"}</p>
                </div>
              ))
          }
        </div>
      </div>

      <LiveChatWindow
        chat={activeChat}
        currentUser={currentUser}
        onResolve={handleResolve}
        initialVisitorOnline={visitorOnlineMap[activeChat?.roomId] ?? false}
        onVisitorStatusChange={(roomId, online) =>
          setVisitorOnlineMap(prev => ({ ...prev, [roomId]: online }))
        }
      />
    </div>
  );
}

// ─── LEADS VIEW ───────────────────────────────────────────────────────────────
function LeadsView({ search }) {
  const [leads,   setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState({});
  const [error,   setError]   = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/api/agent/leads");
      setLeads((d.leads || []).map(normaliseLead));
      setError("");
    } catch (err) {
      setError(`Could not load leads: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const updateStatus = async (id, status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setSaving(p => ({ ...p, [id]: true }));
    try {
      await apiFetch(`/api/agent/leads/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch {}
    finally { setSaving(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  const filtered = leads.filter(l =>
    [l.id, l.customer, l.email, l.printer, l.issue, l.status]
      .some(v => String(v || "").toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
      {[1,2,3,4,5].map(i => <Skeleton key={i} cls="h-10 w-full"/>)}
    </div>
  );

  return (
    <>
      {error && (
        <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchLeads} className="text-red-500 underline text-xs">Retry</button>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">All Leads ({leads.length})</p>
          <button onClick={fetchLeads} className="text-gray-400 hover:text-blue-500 transition-colors text-xs flex items-center gap-1">
            <Icon name="refresh" cls="w-3.5 h-3.5"/> Refresh
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["ID","Customer","Email","Phone","Printer","Issue","Status","Created"].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-400 px-5 py-4 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <p className="text-sm text-gray-400">
                    {search ? "No leads match your search." : "No leads assigned yet."}
                  </p>
                  {!search && (
                    <p className="text-xs text-gray-300 mt-1">Accept a chat request to create your first lead.</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((lead, i, arr) => (
                <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                  <td className="px-5 py-4 text-xs text-gray-500 font-mono">{String(lead.id || "").slice(-6) || "—"}</td>
                  <td className="px-5 py-4 text-xs font-medium text-gray-800 whitespace-nowrap">{lead.customer || "—"}</td>
                  <td className="px-5 py-4 text-xs text-gray-600">{lead.email || "—"}</td>
                  <td className="px-5 py-4 text-xs text-gray-600">{lead.phone || "—"}</td>
                  <td className="px-5 py-4 text-xs text-gray-700 whitespace-nowrap">{lead.printer || "—"}</td>
                  <td className="px-5 py-4 text-xs text-gray-500 min-w-[200px]">
                    <span className="block whitespace-normal">{lead.issue || "—"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <StatusDropdown status={lead.status || "new"} onChange={s => updateStatus(lead.id, s)}/>
                      {saving[lead.id] && <span className="text-xs text-gray-400 animate-pulse">saving…</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-pre-line">
                    {fmtDate(lead.createdAt || lead.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AgentDashboard({ user, onLogout }) {
  const currentUser = user || getUser();

  const [activeNav,    setActiveNav]    = useState("Dashboard");
  const [search,       setSearch]       = useState("");
  const [stats,        setStats]        = useState([]);
  const [leads,        setLeads]        = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // ── Incoming requests — global, persists across all tabs ──────────────────
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [accepting,        setAccepting]        = useState(null);
  const [activeChat,       setActiveChat]       = useState(null);
  const [loadingRequests,  setLoadingRequests]  = useState(true); // show skeleton while loading

  // ── Load waiting chats on every page load / refresh ───────────────────────
  const loadWaitingChats = useCallback(async () => {
    try {
      const data = await apiFetch("/api/agent/chats");
      console.log("[AgentDashboard] chats from API:", data);

      const waiting = (data.chats || [])
        .filter(c => c.status === "waiting")
        .map(c => ({
          roomId:     c.roomId,
          _id:        c._id || c.id,
          customer:   c.visitor?.name  || c.name  || "Visitor",
          email:      c.visitor?.email || c.email || "",
          phone:      c.visitor?.phone || c.phone || "",
          printer:    c.queryContext
            ? `${c.queryContext.printerBrand || ""} ${c.queryContext.printerModel || ""}`.trim()
            : c.printer || "",
          issue:      c.queryContext?.initialMessage || c.issue || "",
          timestamp:  c.createdAt || new Date(),
          cardStatus: "pending",
        }));

      console.log("[AgentDashboard] waiting chats:", waiting.length, waiting);
      setIncomingRequests(prev => {
        // Keep cards that agent already acted on (accepted/declined) — don't remove them on poll
        const actedOn = prev.filter(p => p.cardStatus === "accepted" || p.cardStatus === "declined");
        const actedRoomIds = new Set(actedOn.map(p => p.roomId));

        // Merge: new waiting list + preserve acted-on cards
        const freshWaiting = waiting
          .filter(w => !actedRoomIds.has(w.roomId)) // don't add if agent already acted
          .map(w => {
            const existing = prev.find(p => p.roomId === w.roomId);
            return existing ? { ...w, cardStatus: existing.cardStatus } : w;
          });

        return [...freshWaiting, ...actedOn];
      });
    } catch (err) {
      console.error("[AgentDashboard] Failed to load waiting chats:", err.message);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadWaitingChats();
    // Poll every 5 seconds so new requests appear without refresh
    const interval = setInterval(loadWaitingChats, 5000);
    return () => clearInterval(interval);
  }, [loadWaitingChats]);

  // ── Step 2: Listen for live new requests via Socket.IO ────────────────────
  useEffect(()=>{
    const socket = io(API_BASE, {
      withCredentials: true,
      auth: { token: getToken() },
    });

    socket.on("chat_queue_update", (data) => {
      if (data.action === "waiting") {
        setIncomingRequests(prev =>
          prev.find(r => r.roomId === data.roomId) ? prev :
          [...prev, {
            roomId:     data.roomId,
            customer:   data.visitor?.name  || "Visitor",
            email:      data.visitor?.email || "",
            phone:      data.visitor?.phone || "",
            printer:    "",
            issue:      "",
            timestamp:  new Date(),
            cardStatus: "pending",
          }]
        );
      }
      if (data.action === "accepted") {
        setIncomingRequests(prev =>
          prev.map(r => r.roomId === data.roomId ? { ...r, cardStatus: "accepted" } : r)
        );
        setAccepting(null);
      }
      // Visitor left before agent accepted — remove request card completely
      if (data.action === "visitor_left") {
        setIncomingRequests(prev => prev.filter(r => r.roomId !== data.roomId));
        setAccepting(null);
      }
      if (data.action === "closed") {
        setIncomingRequests(prev => prev.filter(r => r.roomId !== data.roomId));
        setAccepting(null);
      }
    });

    // Auto-assigned directly to this agent
    socket.on("new_chat_assigned", (data) => {
      setIncomingRequests(prev =>
        prev.find(r => r.roomId === data.roomId) ? prev :
        [...prev, {
          roomId:    data.roomId,
          customer:  data.visitor?.name  || "Visitor",
          email:     data.visitor?.email || "",
          phone:     data.visitor?.phone || "",
          printer:   data.queryContext
            ? `${data.queryContext.printerBrand||""} ${data.queryContext.printerModel||""}`.trim()
            : "",
          issue:     data.queryContext?.initialMessage || "",
          timestamp: new Date(),
        }]
      );
    });

    return () => socket.disconnect();
  }, []);

  // ── Accept handler ────────────────────────────────────────────────────────
  const handleAccept = async (req) => {
    setAccepting(req.roomId);
    try {
      let chatId = req._id;
      if (!chatId) {
        const data = await apiFetch("/api/agent/chats");
        const found = (data.chats||[]).find(c => c.roomId === req.roomId);
        chatId = found?._id || found?.id;
      }
      if (chatId) {
        await apiFetch(`/api/agent/chats/${chatId}/accept`, { method: "POST" });
      }
      // Mark as accepted — keep card visible with green status
      setIncomingRequests(prev =>
        prev.map(r => r.roomId === req.roomId ? { ...r, cardStatus: "accepted" } : r)
      );
      
      // Auto-select the newly accepted chat
      const normalised = normaliseChat({...req, status: "active"});
      setActiveChat(normalised);
      setActiveNav("Live Chats");
    } catch (err) {
      console.error("Accept error:", err.message);
      setIncomingRequests(prev =>
        prev.map(r => r.roomId === req.roomId ? { ...r, cardStatus: "declined" } : r)
      );
    } finally {
      setAccepting(null);
    }
  };

  // ── Decline handler ───────────────────────────────────────────────────────
  const handleDecline = (roomId) => {
    // Mark as declined — keep card visible with gray status
    setIncomingRequests(prev =>
      prev.map(r => r.roomId === roomId ? { ...r, cardStatus: "declined" } : r)
    );
  };

  // ── Load stats + leads ────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      try {
        const [sr, ld] = await Promise.all([
          apiFetch("/api/agent/stats"),
          apiFetch("/api/agent/leads"),
        ]);
        setStats(buildStatCards(sr));
        setLeads((ld.leads||[]).map(normaliseLead));
      } catch {
        setStats([]); setLeads([]);
      } finally {
        setLoadingStats(false); setLoadingLeads(false);
      }
    })();
  }, []);

  const NAV_META = {
    "Dashboard":  ["Dashboard",  `Welcome back, ${user?.name?.split(" ")[0]||"Agent"}`],
    "Live Chats": ["Live Chats", "Manage active conversations"],
    "Leads":      ["Leads",      "Track and manage support requests"],
  };
  const [title, subtitle] = NAV_META[activeNav] || ["Dashboard",""];

  return (
    <DashboardLayout
      user={user} navItems={AGENT_NAV} activeNav={activeNav}
      onNavChange={nav => { setActiveNav(nav); setSearch(""); }}
      onLogout={onLogout}
      headerTitle={title} headerSub={subtitle}
      headerRight={activeNav !== "Live Chats" ? (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 w-52 shadow-sm">
          <Icon name="search" cls="w-3.5 h-3.5 text-gray-400 shrink-0"/>
          <input className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder:text-gray-400"
            placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      ) : null}
    >
      {activeNav === "Dashboard" && (
        <DashboardView
          stats={stats} leads={leads}
          loading={loadingStats} loadingLeads={loadingLeads}
          loadingRequests={loadingRequests}
          incomingRequests={incomingRequests}
          onAccept={handleAccept}
          onDecline={handleDecline}
          accepting={accepting}
        />
      )}
      {activeNav === "Live Chats" && (
        <LiveChatsView
          user={currentUser}
          incomingRequests={incomingRequests}
          onAccept={handleAccept}
          onDecline={handleDecline}
          accepting={accepting}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
        />
      )}
      {activeNav === "Leads" && <LeadsView search={search}/>}
    </DashboardLayout>
  );
}