// src/components/PrinterBot.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { API_BASE } from "../lib/constants";

const USER_ID = (() => {
  let id = sessionStorage.getItem("printer_bot_uid");
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("printer_bot_uid", id); }
  return id;
})();

const ISSUE_OPTIONS = [
  { label: "🖨️ Not Printing",      value: "Printer is not printing" },
  { label: "📶 Printer Offline",    value: "Printer shows offline" },
  { label: "📄 Paper Jam",          value: "Paper jam" },
  { label: "🎨 Poor Print Quality", value: "Poor print quality / streaks" },
  { label: "💻 Driver Issue",       value: "Driver not installed or unavailable" },
  { label: "📡 Wi-Fi Setup",        value: "Wireless printer setup" },
  { label: "🔧 Other Issue",        value: "__other__" },
];

// Flat list of all models (no brand grouping)
const MODEL_OPTIONS = [
  "DeskJet 2700",
  "OfficeJet Pro 9015",
  "LaserJet Pro M404n",
  "ENVY 6055",
  "LaserJet MFP M428",
  "Other",
];

const VALIDATORS = {
  name:        (v) => !v.trim() ? "Name cannot be empty." : v.trim().length < 2 ? "At least 2 characters." : null,
  email:       (v) => !v.trim() ? "Email cannot be empty." : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "Enter a valid email." : null,
  phone:       (v) => { const d = v.replace(/\D/g,""); return !v.trim() ? "Phone cannot be empty." : (d.length<7||d.length>15) ? "Phone must be 7-15 digits." : null; },
  location:    (v) => !v.trim() ? "Location cannot be empty." : v.trim().length < 2 ? "Enter a valid city or country." : null,
  issue_other: (v) => !v.trim() ? "Please describe your issue." : v.trim().length < 5 ? "Please provide more detail." : null,
  model_other: (v) => !v.trim() ? "Please enter your printer model." : null,
};

const INPUT_STEPS = ["name","email","phone","location","issue_other","model_other"];

const mapIssueType = (issue) => {
  if (!issue) return "other";
  const i = issue.toLowerCase();
  if (i.includes("driver")) return "driver";
  if (i.includes("wifi")||i.includes("wireless")||i.includes("offline")||i.includes("connect")) return "connectivity";
  if (i.includes("paper")||i.includes("jam")) return "hardware";
  if (i.includes("ink")||i.includes("quality")||i.includes("streak")) return "ink";
  if (i.includes("install")||i.includes("setup")) return "installation";
  return "other";
};

const PrinterBot = ({ isMinimized, setIsMinimized }) => {
  const [step,           setStep]           = useState("issue");
const [messages,       setMessages]       = useState([]);
const [input,          setInput]          = useState("");
const [inputError,     setInputError]     = useState("");
const [isTyping,       setIsTyping]       = useState(false);
const [showIntroText,  setShowIntroText]  = useState(false);
const [liveChatId,     setLiveChatId]     = useState(null);
const [agentConnected, setAgentConnected] = useState(false);
const [agentName,      setAgentName]      = useState("Support Agent");
const [agentTyping,    setAgentTyping]    = useState(false);
const [escalationError,setEscalationError]= useState("");
const [chatClosed,     setChatClosed]     = useState(false);
const [uploading,      setUploading]      = useState(false);
const [replyTo,        setReplyTo] = useState(null); 


const collected           = useRef({ issue:"",model:"",name:"",email:"",phone:"",location:"" });
const conversationHistory = useRef([]);
const chatEndRef          = useRef(null);
const socketRef           = useRef(null);
const fileInputRef        = useRef(null);
const typingTimer         = useRef(null);

  useEffect(() => { const t = setTimeout(()=>setIsMinimized(false),5000); return ()=>clearTimeout(t); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages,step,agentTyping]);
  useEffect(() => {
    if (!isMinimized && messages.length === 0)
      pushBotMsg("Hey! I'm Atlas 👋 Your printer support assistant. What issue are you facing today?",true);
  }, [isMinimized]);
  useEffect(() => {
    if (!isMinimized) return;
    const s=setTimeout(()=>setShowIntroText(true),3000);
    const h=setTimeout(()=>setShowIntroText(false),15000);
    return ()=>{clearTimeout(s);clearTimeout(h);};
  }, [isMinimized]);
  useEffect(() => { return ()=>socketRef.current?.disconnect(); }, []);

  const pushBotMsg = (text, instant=false) => {
    conversationHistory.current.push({sender:"bot",text,created_at:new Date().toISOString()});
    if (instant) { setMessages(prev=>[...prev,{type:"bot",text}]); return; }
    setIsTyping(true);
    setMessages(prev=>[...prev,{type:"bot",text:""}]);
    let i=0;
    const iv=setInterval(()=>{
      i++;
      setMessages(prev=>{const u=[...prev];u[u.length-1]={...u[u.length-1],text:text.slice(0,i)};return u;});
      if(i>=text.length){clearInterval(iv);setIsTyping(false);}
    },16);
  };
  const pushUserMsg = (text, replyMeta = null) => {
  conversationHistory.current.push({
    sender: "customer",
    text,
    created_at: new Date().toISOString(),
    replyTo: replyMeta,
  });

  setMessages((prev) => [
    ...prev,
    { type: "user", text, messageType: "text", replyTo: replyMeta },
  ]);
};
//   const pushUserMsg = (text) => {
//   conversationHistory.current.push({ sender:"customer", text, created_at:new Date().toISOString() });
//   setMessages((prev) => [...prev, { type:"user", text, messageType:"text" }]);
// };

const pushSystemMsg = (text) => {
  setMessages((prev) => [...prev, { type:"system", text }]);
};

const pushAgentMsg = (text, name, replyMeta = null) => {
  setMessages((prev) => [
    ...prev,
    {
      type: "agent",
      text,
      name: name || agentName,
      messageType: "text",
      replyTo: replyMeta,
    },
  ]);
};

// const pushAgentMsg = (text, name) => {
//   setMessages((prev) => [...prev, { type:"agent", text, name: name || agentName, messageType:"text" }]);
// };
const buildFileUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
};

const pushUserAttachmentMsg = (file, replyMeta = null) => {
  setMessages((prev) => [
    ...prev,
    {
      type: "user",
      text: file.fileName || "Attachment",
      messageType: file.type || "file",
      fileUrl: buildFileUrl(file.fileUrl),
      fileName: file.fileName || "",
      mimeType: file.mimeType || "",
      fileSize: file.fileSize || 0,
      replyTo: replyMeta,
    },
  ]);
};
const pushAgentAttachmentMsg = (file, name, replyMeta = null) => {
  setMessages((prev) => [
    ...prev,
    {
      type: "agent",
      text: file.fileName || "Attachment",
      name: name || agentName,
      messageType: file.type || "file",
      fileUrl: buildFileUrl(file.fileUrl),
      fileName: file.fileName || "",
      mimeType: file.mimeType || "",
      fileSize: file.fileSize || 0,
      replyTo: replyMeta,
    },
  ]);
};
  // const pushUserMsg   = (text) => { conversationHistory.current.push({sender:"customer",text,created_at:new Date().toISOString()}); setMessages(prev=>[...prev,{type:"user",text}]); };
  // const pushSystemMsg = (text) => setMessages(prev=>[...prev,{type:"system",text}]);
  // const pushAgentMsg  = (text, name) => setMessages(prev=>[...prev,{type:"agent",text, name: name || agentName}]);
  
  const buildReplyMeta = (msg) => ({
  id: msg.id || Date.now(),
  text: msg.fileName || msg.text || "Attachment",
  type: msg.messageType || "text",
  senderName: msg.name || "Support Agent",
});

  const connectToRoom = useCallback((roomId) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(API_BASE, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_chat", { roomId, visitorName: collected.current.name });
    });

socket.on("chat_history", (history) => {
  if (!history?.length) return;

  history.forEach((m) => {
    if (m.sender === "agent" || m.sender === "admin") {
      if (m.senderName) setAgentName(m.senderName);

      if ((m.type === "image" || m.type === "file") && m.fileUrl) {
        pushAgentAttachmentMsg(
          {
            type: m.type,
            fileUrl: m.fileUrl,
            fileName: m.fileName,
            mimeType: m.mimeType,
            fileSize: m.fileSize,
          },
          m.senderName,
           m.replyTo || null
        );
      } else {
       pushAgentMsg(m.text, m.senderName, m.replyTo || null);
      }
    }
  });
});

    socket.on("agent_connected", (data) => {
      setAgentConnected(true);
      if (data.name) setAgentName(data.name);
      pushSystemMsg(data.message || `✅ ${data.name || "An agent"} has joined. How can we help you?`);
    });

    socket.on("user_joined", (data) => {
      if (data.message?.toLowerCase().includes("agent")) {
        setAgentConnected(true);
        if (data.name) setAgentName(data.name);
        pushSystemMsg(data.message || "✅ Agent has joined the chat.");
      }
    });

 socket.on("receive_message", (msg) => {
  if (msg.sender === "agent" || msg.sender === "admin") {
    if (msg.senderName) setAgentName(msg.senderName);

    if ((msg.type === "image" || msg.type === "file") && msg.fileUrl) {
      pushAgentAttachmentMsg(
        {
          type: msg.type,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          mimeType: msg.mimeType,
          fileSize: msg.fileSize,
        },
        msg.senderName,
         msg.replyTo || null
        
        
      );
    } else {
      pushAgentMsg(msg.text, msg.senderName, msg.replyTo || null);
    }
  }
});

    socket.on("typing_indicator", ({sender,isTyping}) => {
      if (sender==="agent"||sender==="admin") setAgentTyping(isTyping);
    });

    socket.on("chat_closed", () => {
      setChatClosed(true);
      setAgentTyping(false);
      pushSystemMsg("Chat has been closed by the agent. Thank you!");
    });
  }, []);

  const uploadAttachment = async (file) => {
  if (!liveChatId || !file) return null;

  const formData = new FormData();
  formData.append("attachment", file);

  const res = await fetch(`${API_BASE}/api/chat/${liveChatId}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Upload failed");
  }

  return data.file;
};

const handleLiveAttachment = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !liveChatId || chatClosed || !agentConnected) return;

  try {
    setUploading(true);

    const uploaded = await uploadAttachment(file);

   pushUserAttachmentMsg(uploaded, replyTo);

socketRef.current?.emit("send_message", {
  roomId: liveChatId,
  sender: "visitor",
  senderId: USER_ID,
  text: uploaded.fileName || "",
  type: uploaded.type,
  fileUrl: uploaded.fileUrl,
  fileName: uploaded.fileName,
  fileSize: uploaded.fileSize,
  mimeType: uploaded.mimeType,
  replyTo,
});

setReplyTo(null);
  } catch (err) {
    console.warn("[PrinterBot attachment upload failed]", err.message);
  } finally {
    setUploading(false);
    e.target.value = "";
  }
};

const sendLiveMessage = () => {
  const text = input.trim();
  if (!text || !liveChatId || chatClosed) return;

  pushUserMsg(text, replyTo);
  setInput("");

  socketRef.current?.emit("send_message", {
    roomId: liveChatId,
    text,
    sender: "visitor",
    senderId: USER_ID,
    type: "text",
    replyTo,
  });

  setReplyTo(null);
};
  // const typingTimer = useRef(null);
  const handleLiveInput = (e) => {
    setInput(e.target.value);
    if (!liveChatId) return;
    socketRef.current?.emit("typing_start",{roomId:liveChatId,sender:"visitor"});
    clearTimeout(typingTimer.current);
    typingTimer.current=setTimeout(()=>socketRef.current?.emit("typing_stop",{roomId:liveChatId,sender:"visitor"}),1500);
  };

  const handleIssueSelect = (option) => {
    if (option.value==="__other__") {
      pushUserMsg(option.label);
      setTimeout(()=>{ pushBotMsg("Please describe your issue briefly."); setStep("issue_other"); }, 400);
    } else {
      pushUserMsg(option.label);
      collected.current.issue = option.value;
      // Skip brand — go straight to model
      setTimeout(()=>{ pushBotMsg("Which printer model do you have?"); setStep("model"); }, 400);
    }
  };

  const handleModelSelect = (model) => {
    if (model==="Other") {
      pushUserMsg(model);
      setTimeout(()=>{ pushBotMsg("Please enter your printer model."); setStep("model_other"); }, 400);
    } else {
      pushUserMsg(model);
      collected.current.model = model;
      setTimeout(()=>{ pushBotMsg("To connect you with a certified technician, I need a few details. Would you like to proceed?"); setStep("consent"); }, 400);
    }
  };

  const handleConsent = (yes) => {
    if (yes) { pushUserMsg("Yes"); setTimeout(()=>{ pushBotMsg("What's your full name?"); setStep("name"); }, 400); }
    else { pushUserMsg("No"); setTimeout(()=>{ pushBotMsg("Thank you for reaching out! Come back anytime. 👋"); setStep("declined"); }, 400); }
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    const err = VALIDATORS[step]?.(trimmed);
    if (err) { setInputError(err); return; }
    setInputError(""); setInput(""); pushUserMsg(trimmed);
    if (step==="issue_other") {
      collected.current.issue = trimmed;
      setTimeout(()=>{ pushBotMsg("Which printer model do you have?"); setStep("model"); }, 400);
    }
    else if (step==="model_other") {
      collected.current.model = trimmed;
      setTimeout(()=>{ pushBotMsg("To connect you with a certified technician, I need a few details. Would you like to proceed?"); setStep("consent"); }, 400);
    }
    else if (step==="name")     { collected.current.name=trimmed;     setTimeout(()=>{ pushBotMsg("What's your email address?");        setStep("email");    }, 400); }
    else if (step==="email")    { collected.current.email=trimmed;    setTimeout(()=>{ pushBotMsg("What's your phone number?");          setStep("phone");    }, 400); }
    else if (step==="phone")    { collected.current.phone=trimmed;    setTimeout(()=>{ pushBotMsg("Please provide your city or country."); setStep("location"); }, 400); }
    else if (step==="location") { collected.current.location=trimmed; setTimeout(()=>{ setStep("confirm"); }, 400); }
  };

  const escalateToBackend = async () => {
    setEscalationError("");
    try {
      const res = await fetch(`${API_BASE}/api/chats/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          collected.current.name,
          email:         collected.current.email,
          phone:         collected.current.phone,
          printerModel:  collected.current.model,
          issueType:     mapIssueType(collected.current.issue),
          initialMessage:collected.current.issue,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      return data.roomId;
    } catch(err) {
      console.warn("[PrinterBot] Escalation failed:", err.message);
      setEscalationError("Could not reach support. Please try again or call us directly.");
      return null;
    }
  };

  const handleConfirm = async () => {
    setStep("connecting");
    const roomId = await escalateToBackend();
    if (roomId) {
      setLiveChatId(roomId);
      connectToRoom(roomId);
      pushBotMsg(`You're connected, ${collected.current.name}! ✅ Please wait while an agent joins your chat.`);
    } else {
      pushBotMsg(`Hi ${collected.current.name}, we couldn't reach our servers. Please call us directly.`);
    }
    setStep("live");
  };

  const handleEdit = () => { pushBotMsg("No problem! What's your full name?"); setStep("name"); };

  const refreshChat = () => {
    socketRef.current?.disconnect(); socketRef.current=null;
    setStep("issue"); setMessages([]); setInput(""); setInputError("");
    setLiveChatId(null); setAgentConnected(false); setAgentTyping(false); setChatClosed(false); setEscalationError("");setUploading(false);
    collected.current = { issue:"", model:"", name:"", email:"", phone:"", location:"" };
    conversationHistory.current = [];
    setTimeout(()=>pushBotMsg("Hey! I'm Atlas 👋 Your printer support assistant. What issue are you facing today?",true),50);
  };

  const getPlaceholder = () => ({
    name:        "Enter your full name...",
    email:       "Enter your email address...",
    phone:       "Enter your phone number...",
    location:    "Enter your city or country...",
    issue_other: "Describe your issue...",
    model_other: "Enter your printer model...",
  }[step] || "");

  const renderChatMessage = (msg, isDark = false) => {
  if (msg.messageType === "image" && msg.fileUrl) {
    return (
      <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="block">
        <img
          src={msg.fileUrl}
          alt={msg.fileName || "attachment"}
          className="max-w-[220px] rounded-xl border border-gray-200"
        />
      </a>
    );
  }

  if (msg.messageType === "file" && msg.fileUrl) {
    return (
      <a
        href={msg.fileUrl}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
          isDark
            ? "border-white/20 bg-white/10 text-white"
            : "border-gray-200 bg-white text-gray-700"
        }`}
      >
      <svg
  xmlns="http://www.w3.org/2000/svg"
  className={`w-4 h-4 ${isDark ? "text-white/80" : "text-gray-500"}`}
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  strokeWidth={2}
>
  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 10.828a4 4 0 10-5.656-5.656L6.757 10.757a6 6 0 108.486 8.486L20 13" />
</svg>
        <span className="text-xs font-medium truncate max-w-[180px]">
          {msg.fileName || "Attachment"}
        </span>
      </a>
    );
  }

  return <span>{msg.text}</span>;
};

const renderReplyPreview = (reply, isDark = false) => {
  if (!reply) return null;

  const isImage = reply.type === "image";
  const isFile = reply.type === "file";

  const previewText =
    reply.text ||
    (isImage ? "Photo" : isFile ? "Attachment" : "Message");

  return (
    <div
      className={`mb-2 rounded-xl border-l-2 px-2.5 py-1.5 ${
        isDark
          ? "border-white/30 bg-white/10"
          : "border-green-200 bg-green-50"
      }`}
    >
      <p
        className={`text-[10px] font-semibold ${
          isDark ? "text-white/90" : "text-green-700"
        }`}
      >
        {reply.senderName}
      </p>
      <p
        className={`truncate text-[11px] ${
          isDark ? "text-white/75" : "text-gray-600"
        }`}
      >
        {previewText}
      </p>
    </div>
  );
};

  const showPreLiveInput = INPUT_STEPS.includes(step);

  if (isMinimized) return (
    <AnimatePresence>
      <motion.div key="minimized" className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 animate-bounce">
        <AnimatePresence>
          {showIntroText&&(<motion.div initial={{opacity:0,scale:0.6,x:20}} animate={{opacity:1,scale:1,x:0}} exit={{opacity:0,scale:0.6,x:20}} className="relative -translate-y-6">
            <img src="/bot_text.svg" alt="Chat Intro" className="w-48 h-20 object-contain"/>
            <div className="absolute top-7 left-4 right-4 text-sm text-black text-center leading-tight">Hi, how can I help you?</div>
          </motion.div>)}
        </AnimatePresence>
        <button onClick={()=>setIsMinimized(false)} className="w-16 h-16 rounded-full bg-white border-2 border-[#5695D0]">
          <img src="/atlas_icon.svg" alt="Atlas" className="w-full h-full object-contain scale-[0.7]"/>
        </button>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <AnimatePresence>
      <motion.div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <div className="rounded-[26px] p-[1.5px] bg-gradient-to-b from-white to-[#5695D0]">
          <div className="w-[94vw] sm:w-[350px] h-[600px] sm:h-[580px] rounded-[26px] px-4 pt-4 pb-3 flex flex-col bg-gradient-to-b from-[#9dc4e8] to-white text-black overflow-hidden">

            {/* HEADER */}
            <div className="flex items-center justify-between h-[38px] flex-shrink-0">
              <div className="flex items-center gap-2">
                <img src="/Vector.svg" alt="Atlas" className="w-[28px] h-[28px]"/>
                <span className="text-[24px] leading-[38px] font-Inter">
                  {step==="live"&&agentConnected ? agentName.split(" ")[0] : "Atlas"}
                </span>
                {step==="live"?(
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${agentConnected?"bg-green-50 border-green-200 text-green-700":"bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${agentConnected?"bg-green-500":"bg-amber-400 animate-pulse"}`}/>
                    {agentConnected?"Agent Online":"Waiting..."}
                  </div>
                ):(
                  <div className="flex items-center gap-1 bg-white/70 border border-[#5695D0]/40 rounded-full px-2 py-0.5 shadow-sm">
                    <span className="text-base leading-none">🇺🇸</span>
                    <span className="text-[10px] text-gray-600 font-medium">USA</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button onClick={refreshChat} className="text-gray-500 hover:text-black transition-colors text-lg" title="Restart">↻</button>
                <button onClick={()=>setIsMinimized(true)} className="text-gray-500 hover:text-black transition-colors" title="Close">✕</button>
              </div>
            </div>

            {/* AGENT BADGE */}
            {step==="live"&&agentConnected&&(
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="mt-2 flex items-center gap-3 bg-green-50 px-3 py-2 rounded-xl border border-green-200 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {agentName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-700">{agentName}</p>
                  <p className="text-xs text-gray-500">Connected · Ready to help</p>
                </div>
              <span className="max-w-[120px] truncate text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex-shrink-0">
  {agentName || "Support Agent"}
</span>
              </motion.div>
            )}

            {/* WAITING BADGE */}
            {step==="live"&&!agentConnected&&!chatClosed&&(
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="mt-2 flex items-center gap-3 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-amber-400 text-white flex items-center justify-center flex-shrink-0"><span className="animate-pulse text-lg">⏳</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-amber-700">Finding an agent...</p><p className="text-xs text-gray-500">Average wait: under 2 minutes</p></div>
              </motion.div>
            )}

            {/* CONNECTING LOADER */}
            {step==="connecting"&&(
              <div className="mt-4 flex flex-col items-center flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-[#5695D0]/30 animate-pulse"/>
                <p className="text-sm mt-2 text-gray-500">Connecting to certified technician...</p>
              </div>
            )}

            {/* CONFIRMATION CARD */}
            {step==="confirm"&&(
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="mt-3 bg-white rounded-2xl border border-[#5695D0]/40 shadow-sm p-4 flex flex-col gap-3 flex-shrink-0">
                <p className="text-sm font-semibold text-[#286CAC] text-center">Please confirm your details</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    {label:"🖨️ Issue",   value:collected.current.issue},
                    {label:"🖨️ Model",   value:collected.current.model},
                    {label:"👤 Name",    value:collected.current.name},
                    {label:"✉️ Email",   value:collected.current.email},
                    {label:"📞 Phone",   value:collected.current.phone},
                    {label:"📍 Location",value:collected.current.location},
                  ].map(({label,value})=>(
                    <div key={label} className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 w-24 flex-shrink-0">{label}</span>
                      <span className="font-medium text-gray-800 break-all">{value}</span>
                    </div>
                  ))}
                </div>
                {escalationError&&<p className="text-xs text-red-500 text-center">{escalationError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleEdit} className="flex-1 py-1.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">✏️ Edit</button>
                  <button onClick={handleConfirm} className="flex-1 py-1.5 rounded-xl bg-[#5695D0] text-white text-sm font-medium hover:bg-[#286CAC]">✅ Confirm</button>
                </div>
              </motion.div>
            )}

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 mt-3 min-h-0">
              <AnimatePresence initial={false}>
                {messages.map((msg,i)=>{
                  if(msg.type==="system") return(
                    <motion.div key={i} initial={{opacity:0}} animate={{opacity:1}} className="flex items-center gap-2 my-1">
                      <div className="flex-1 h-px bg-gray-200"/><span className="text-[10px] text-gray-400 whitespace-nowrap px-2">{msg.text}</span><div className="flex-1 h-px bg-gray-200"/>
                    </motion.div>
                  );
                  if(msg.type==="agent") return(
                    <motion.div key={i} initial={{opacity:0,x:-20,scale:0.95}} animate={{opacity:1,x:0,scale:1}} transition={{duration:0.2}} className="flex flex-col items-start">
                      <span className="text-xs text-green-600 font-medium mb-0.5">{msg.name || "Support Agent"}</span>
                     <div className="group relative max-w-[85%] px-4 py-2 rounded-xl bg-green-500 text-white text-sm leading-relaxed">
  {renderReplyPreview(msg.replyTo, true)}
  {renderChatMessage(msg, true)}

  <button
    type="button"
    onClick={() => setReplyTo(buildReplyMeta(msg))}
    className="absolute -right-2 -top-2 hidden h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-sm group-hover:flex"
    title="Reply"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h10a4 4 0 014 4v7m0 0l-4-4m4 4l4-4"
      />
    </svg>
  </button>
</div>
                    </motion.div>
                  );
                  if(msg.type==="user") return(
                    <motion.div key={i} initial={{opacity:0,x:20,scale:0.95}} animate={{opacity:1,x:0,scale:1}} transition={{duration:0.2}} className="flex flex-col items-end">
                      <span className="text-xs opacity-60 mb-0.5">You</span>
                      <div className="max-w-[85%] px-4 py-2 rounded-xl bg-white text-black text-sm leading-relaxed">
  {renderReplyPreview(msg.replyTo, false)}
  {renderChatMessage(msg, false)}
</div>
                    </motion.div>
                  );
                  return(
                    <motion.div key={i} initial={{opacity:0,x:-20,scale:0.95}} animate={{opacity:1,x:0,scale:1}} transition={{duration:0.2}} className="flex flex-col items-start">
                      <span className="text-xs opacity-60 mb-0.5">Atlas</span>
                      <div className="max-w-[85%] px-4 py-2 rounded-xl bg-[#286CAC] text-white text-sm leading-relaxed">{msg.text}</div>
                    </motion.div>
                  );
                })}
                {agentTyping&&(
                  <motion.div key="agent-typing" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="flex flex-col items-start">
                    <span className="text-xs text-green-600 font-medium mb-0.5">Support Agent</span>
                    <div className="px-4 py-2 rounded-xl bg-green-500 text-white flex gap-1">
                      {[0,0.2,0.4].map((delay,idx)=><motion.span key={idx} animate={{opacity:[0.2,1,0.2]}} transition={{repeat:Infinity,duration:1,delay}}>.</motion.span>)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {step==="issue"&&!isTyping&&(<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap gap-2 mt-1">{ISSUE_OPTIONS.map(opt=><button key={opt.value} onClick={()=>handleIssueSelect(opt)} className="px-3 py-1.5 rounded-full bg-white border border-[#5695D0] text-[#286CAC] text-xs font-medium hover:bg-[#5695D0] hover:text-white transition-colors shadow-sm">{opt.label}</button>)}</motion.div>)}
              {step==="model"&&!isTyping&&(<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap gap-2 mt-1">{MODEL_OPTIONS.map(model=><button key={model} onClick={()=>handleModelSelect(model)} className="px-3 py-1.5 rounded-full bg-white border border-[#5695D0] text-[#286CAC] text-xs font-medium hover:bg-[#5695D0] hover:text-white transition-colors shadow-sm">{model}</button>)}</motion.div>)}
              {step==="consent"&&!isTyping&&(<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex gap-2 mt-1"><button onClick={()=>handleConsent(true)} className="flex-1 py-2 rounded-full bg-[#5695D0] text-white text-sm font-medium hover:bg-[#286CAC] shadow-sm">✅ Yes</button><button onClick={()=>handleConsent(false)} className="flex-1 py-2 rounded-full bg-white border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 shadow-sm">✕ No</button></motion.div>)}
              {step==="declined"&&!isTyping&&(<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-col items-center gap-3 mt-4"><div className="text-4xl">👋</div><button onClick={refreshChat} className="px-4 py-2 rounded-full bg-white border border-[#5695D0] text-[#286CAC] text-xs font-medium hover:bg-[#5695D0] hover:text-white shadow-sm">Start Over</button></motion.div>)}

              <div ref={chatEndRef}/>
            </div>

            {/* PRE-LIVE INPUT */}
            {showPreLiveInput&&(
              <div className="mt-3 flex-shrink-0">
                <AnimatePresence>{inputError&&(<motion.p initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="text-red-500 text-[11px] mb-1.5 px-1 flex items-center gap-1"><span>⚠</span> {inputError}</motion.p>)}</AnimatePresence>
                <div className={`flex gap-2 border rounded-xl px-4 py-2 bg-white/80 ${inputError?"border-red-400":"border-[#5695D0]/60"}`}>
                  <input value={input} onChange={e=>{setInput(e.target.value);if(inputError)setInputError("");}} placeholder={getPlaceholder()} className="flex-1 bg-transparent outline-none text-sm min-w-0" onKeyDown={e=>e.key==="Enter"&&sendMessage()} type={step==="email"?"email":step==="phone"?"tel":"text"} autoFocus/>
                  <button onClick={sendMessage} className="w-8 h-8 flex-shrink-0 bg-[#5695D0] rounded-full text-white flex items-center justify-center hover:bg-[#286CAC]">↑</button>
                </div>
              </div>
            )}

            {/* LIVE CHAT INPUT */}
            {step==="live"&&!chatClosed&&(
              <div className="mt-3 flex-shrink-0">
                {replyTo && (
  <div className="mb-2 flex items-start justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-green-700">
        Replying to {replyTo.senderName}
      </p>
      <p className="truncate text-[11px] text-gray-600">
        {replyTo.text}
      </p>
    </div>
    <button
      type="button"
      onClick={() => setReplyTo(null)}
      className="ml-2 text-xs text-gray-500 hover:text-black"
    >
      ✕
    </button>
  </div>
)}
                <input
      ref={fileInputRef}
      type="file"
      className="hidden"
      onChange={handleLiveAttachment}
      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
    />
                <div className={`flex gap-2 border rounded-xl px-4 py-2 bg-white/80 transition-colors ${!agentConnected?"border-amber-300/60 opacity-70":"border-green-400/60"}`}>
  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    disabled={!agentConnected || chatClosed || uploading}
    className="w-8 h-8 flex-shrink-0 rounded-full border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
    title="Attach file"
  >
    <svg
  xmlns="http://www.w3.org/2000/svg"
  className="w-4 h-4"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  strokeWidth={2}
>
  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 10.828a4 4 0 10-5.656-5.656L6.757 10.757a6 6 0 108.486 8.486L20 13" />
</svg>
  </button>

  <input
    value={input}
    onChange={handleLiveInput}
    placeholder={agentConnected?"Type a message...":"Waiting for agent to join..."}
    disabled={!agentConnected}
    className="flex-1 bg-transparent outline-none text-sm min-w-0 disabled:cursor-not-allowed"
    onKeyDown={e=>e.key==="Enter"&&agentConnected&&sendLiveMessage()}
  />

  <button
    onClick={sendLiveMessage}
    disabled={!agentConnected||!input.trim()}
    className="w-8 h-8 flex-shrink-0 bg-[#5695D0] rounded-full text-white flex items-center justify-center hover:bg-[#286CAC] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    ↑
  </button>
</div>
                {!agentConnected&&<p className="text-[10px] text-amber-600 text-center mt-1">Chat will unlock when agent joins</p>}
              </div>
            )}

            {/* CHAT CLOSED */}
            {step==="live"&&chatClosed&&(
              <div className="mt-3 flex-shrink-0 text-center">
                <p className="text-xs text-gray-500 mb-2">This chat has ended.</p>
                <button onClick={refreshChat} className="px-4 py-1.5 rounded-full bg-[#5695D0] text-white text-xs font-medium hover:bg-[#286CAC]">Start New Chat</button>
              </div>
            )}

            <div className="text-center text-xs mt-2 text-gray-400 flex-shrink-0">Powered by <b className="text-gray-600">Printer Support</b></div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrinterBot;