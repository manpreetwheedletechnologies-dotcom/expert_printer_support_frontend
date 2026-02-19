import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Validation Helpers ──────────────────────────────────────────────────────

const validateName = (v) => {
  if (!v.trim()) return "Name cannot be empty.";
  if (v.trim().length < 2) return "Name must be at least 2 characters.";
  if (!/^[a-zA-Z\s'\-]+$/.test(v.trim()))
    return "Name can only contain letters, spaces, hyphens or apostrophes.";
  return null;
};

const validateEmail = (v) => {
  if (!v.trim()) return "Email cannot be empty.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()))
    return "Enter a valid email address (e.g. name@email.com).";
  return null;
};

const validatePhone = (v) => {
  const digits = v.replace(/\D/g, "");
  if (!v.trim()) return "Phone number cannot be empty.";
  if (digits.length < 7 || digits.length > 15)
    return "Phone must be between 7 and 15 digits.";
  return null;
};

const validateLocation = (v) => {
  if (!v.trim()) return "Location cannot be empty.";
  if (v.trim().length < 2) return "Enter a valid city or country name.";
  if (!/^[a-zA-Z\s,'\-]+$/.test(v.trim()))
    return "Location can only contain letters, commas, spaces or hyphens.";
  return null;
};

const validateFreeText = (v) => {
  if (!v.trim()) return "Please type a message before sending.";
  return null;
};

const VALIDATORS = {
  name: validateName,
  email: validateEmail,
  phone: validatePhone,
  location: validateLocation,
};

// ─── Component ───────────────────────────────────────────────────────────────
const PrinterBot = ({ isMinimized, setIsMinimized }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [showIntroText, setShowIntroText] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [responseCount, setResponseCount] = useState(0);
  const [collecting, setCollecting] = useState(null);
  const userDetails = useRef({ name: "", email: "", phone: "", location: "" });

  const [isConnecting, setIsConnecting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLiveAssistant, setIsLiveAssistant] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isMinimized && messages.length === 0) {
      setMessages([{ type: "bot", text: "Hey! I'm Atlas, How can I help you?" }]);
    }
  }, [isMinimized]);

  useEffect(() => {
    resetBackendSession();
    setMessages([]);
    setResponseCount(0);
    setCollecting(null);
    setIsConnecting(false);
    setShowProfile(false);
    setIsLiveAssistant(false);
    setShowConfirmation(false);
    userDetails.current = { name: "", email: "", phone: "", location: "" };
  }, []);

  useEffect(() => {
    if (!isMinimized) return;
    const showTimer = setTimeout(() => setShowIntroText(true), 3000);
    const hideTimer = setTimeout(() => setShowIntroText(false), 15000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [isMinimized]);

  // ── Backend Helpers ──────────────────────────────────────────────────────
  const resetBackendSession = async () => {
    try {
      await fetch("http://127.0.0.1:5000/reset-session", {
        method: "POST",
        headers: { "x-api-key": "MY_SUPER_SECRET_KEY", "Content-Type": "application/json" },
      });
    } catch (_) {}
  };

  const typeBotMessage = (fullText) => {
    let index = 0;
    setMessages((prev) => [...prev, { type: "bot", text: "" }]);
    const interval = setInterval(() => {
      index++;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: fullText.slice(0, index),
        };
        return updated;
      });
      if (index >= fullText.length) clearInterval(interval);
    }, 40);
  };

  // ── Send Message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    setInputError("");
    const trimmed = input.trim();

    const error = collecting
      ? VALIDATORS[collecting]?.(trimmed)
      : validateFreeText(trimmed);

    if (error) {
      setInputError(error);
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { type: "user", text: trimmed }]);
    setIsTyping(true);

    // ── Collecting Details ──
    if (collecting) {
      let nextPrompt = "";

      if (collecting === "name") {
        userDetails.current.name = trimmed;
        setCollecting("email");
        nextPrompt = "Please provide your email address.";
      } else if (collecting === "email") {
        userDetails.current.email = trimmed;
        setCollecting("phone");
        nextPrompt = "Please provide your phone number.";
      } else if (collecting === "phone") {
        userDetails.current.phone = trimmed;
        setCollecting("location");
        nextPrompt = "Please provide your city or country.";
      } else if (collecting === "location") {
        userDetails.current.location = trimmed;
        setCollecting(null);
        setIsTyping(false);
        // Show confirmation card instead of connecting directly
        setShowConfirmation(true);
        return;
      }

      setTimeout(() => { setIsTyping(false); typeBotMessage(nextPrompt); }, 600);
      return;
    }

    // ── Normal API Flow ──
    try {
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "x-api-key": "MY_SUPER_SECRET_KEY", "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();
      let botReply = data.reply || "No response from server.";
      const isNotPrinter = data.not_printer === true;
      const newCount = responseCount + 1;
      setResponseCount(newCount);

      if (newCount >= 3 && !collecting && !isNotPrinter) {
        setCollecting("name");
        botReply =
          "It seems your question requires detailed assistance. Please provide your full name and our expert will contact you.";
      }

      setTimeout(() => {
        setIsTyping(false);
        if (isNotPrinter) {
          // Push a special warning message type
          setMessages((prev) => [...prev, { type: "warning", text: botReply }]);
        } else {
          typeBotMessage(botReply);
        }
      }, 600);
    } catch {
      setTimeout(() => { setIsTyping(false); typeBotMessage("Sorry, something went wrong."); }, 600);
    }
  };

  const refreshChat = () => {
    resetBackendSession();
    setMessages([]);
    setResponseCount(0);
    setCollecting(null);
    setIsConnecting(false);
    setShowProfile(false);
    setIsLiveAssistant(false);
    setInputError("");
    setShowConfirmation(false);
    userDetails.current = { name: "", email: "", phone: "", location: "" };
  };

  // ── Dynamic Placeholder ──────────────────────────────────────────────────
  const getPlaceholder = () => {
    if (collecting === "name") return "Enter your full name...";
    if (collecting === "email") return "Enter your email address...";
    if (collecting === "phone") return "Enter your phone number...";
    if (collecting === "location") return "Enter your city or country...";
    return "Ask me anything...";
  };

  /* ─────────────────── MINIMIZED VIEW ──────────────────────────────────── */
  if (isMinimized) {
    return (
      <AnimatePresence>
        <motion.div
          key="minimized"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 animate-bounce"
        >
          <AnimatePresence>
            {showIntroText && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6, x: 20 }}
                className="relative -translate-y-6"
              >
                <img src="/bot_text.svg" alt="Chat Intro" className="w-48 h-20 object-contain" />
                <div className="absolute top-7 left-4 right-4 text-sm text-black text-center leading-tight">
                  Hi, how can I help you?
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsMinimized(false)}
            className="w-16 h-16 rounded-full bg-white border-2 border-[#5695D0]"
          >
            <img src="/atlas_icon.svg" alt="Atlas" className="w-full h-full object-contain scale-[0.7]" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ─────────────────── FULL VIEW ────────────────────────────────────────── */
  return (
    <AnimatePresence>
      <motion.div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <div className="rounded-[26px] p-[1.5px] bg-gradient-to-b from-[white] to-[#5695D0]">
          <div className="w-[94vw] sm:w-[350px] h-[600px] sm:h-[550px] rounded-[26px] px-4 pt-4 pb-3 flex flex-col bg-gradient-to-b from-[#9dc4e8] to-white text-black overflow-hidden">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between h-[38px]">
              <div className="flex items-center gap-2">
                <img src="/Vector.svg" alt="Atlas" className="w-[28px] h-[28px]" />
                <span className="text-[24px] leading-[38px] font-Inter">
                  {isLiveAssistant ? "Assistant" : "Atlas"}
                </span>

                {/* 🇺🇸 Hardcoded USA Flag Badge */}
                <div
                  title="United States"
                  className="flex items-center gap-1 bg-white/70 border border-[#5695D0]/40 rounded-full px-2 py-0.5 shadow-sm"
                >
                  <span className="text-base leading-none">🇺🇸</span>
                  <span className="text-[10px] text-gray-600 font-medium">USA</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={refreshChat}
                  className="text-gray-500 hover:text-black transition-colors text-lg"
                  title="Refresh chat"
                >↻</button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-gray-500 hover:text-black transition-colors"
                  title="Close"
                >✕</button>
              </div>
            </div>

            {/* ── CONNECTING LOADER ── */}
            {isConnecting && (
              <div className="mt-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-300 animate-pulse" />
                <p className="text-sm mt-2 text-gray-600">Connecting to certified technician...</p>
              </div>
            )}

            {/* ── CONFIRMATION CARD ── */}
            {showConfirmation && !isConnecting && !showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 bg-white rounded-2xl border border-[#5695D0]/40 shadow-sm p-4 flex flex-col gap-3"
              >
                <p className="text-sm font-semibold text-[#286CAC] text-center">Please confirm your details</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "👤 Name", value: userDetails.current.name },
                    { label: "✉️ Email", value: userDetails.current.email },
                    { label: "📞 Phone", value: userDetails.current.phone },
                    { label: "📍 Location", value: userDetails.current.location },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
                      <span className="font-medium text-gray-800 break-all">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      // Edit: restart collection from name
                      setShowConfirmation(false);
                      setCollecting("name");
                      typeBotMessage("No problem! Let's start over. Please provide your full name.");
                    }}
                    className="flex-1 py-1.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      setIsConnecting(true);
                      setTimeout(() => {
                        setIsConnecting(false);
                        setShowProfile(true);
                        setIsLiveAssistant(true);
                        typeBotMessage(`Hi ${userDetails.current.name}, how can I help you today?`);
                      }, 2500);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-[#5695D0] text-white text-sm font-medium hover:bg-[#286CAC] transition-colors"
                  >
                    ✅ Confirm
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── TECHNICIAN PROFILE ── */}
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-3 bg-green-50 p-3 rounded-xl border border-green-200"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                  TS
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700">Certified Technician</p>
                  <p className="text-xs text-gray-600">Online • Ready to Assist</p>
                </div>
              </motion.div>
            )}

            {/* ── CHAT MESSAGES ── */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 mt-3">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: msg.type === "user" ? 40 : -40, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}
                  >
                    {msg.type !== "warning" && (
                      <span className="text-xs opacity-70 mb-0.5">
                        {msg.type === "user" ? "You" : isLiveAssistant ? "Assistant" : "Atlas"}
                      </span>
                    )}
                    {msg.type === "warning" ? (
                      <div className="max-w-[92%] flex items-start gap-2 bg-amber-50 border border-amber-300 text-amber-800 px-3 py-2 rounded-xl text-xs leading-relaxed">
                        <span className="text-base mt-0.5 flex-shrink-0">🖨️</span>
                        <span>{msg.text.replace("⚠️ ", "")}</span>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] px-4 py-2 rounded-xl ${
                          msg.type === "user"
                            ? "bg-white text-black"
                            : "bg-[#286CAC] border border-[#5695D0] text-white"
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-start"
                  >
                    <span className="text-xs opacity-70">Atlas</span>
                    <div className="max-w-[85%] px-4 py-2 rounded-xl bg-[#286CAC] border border-[#5695D0] text-white flex gap-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.span
                          key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ repeat: Infinity, duration: 1, delay }}
                        >.</motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* ── INPUT AREA ── */}
            {!showConfirmation && (
              <div className="mt-3">
              {/* Validation Error */}
              <AnimatePresence>
                {inputError && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-red-500 text-[11px] mb-1.5 px-1 flex items-center gap-1"
                  >
                    <span>⚠</span> {inputError}
                  </motion.p>
                )}
              </AnimatePresence>

              <div
                className={`flex gap-2 border rounded-xl px-4 py-2 transition-colors ${
                  inputError ? "border-red-400 bg-red-50/40" : "border-black"
                }`}
              >
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (inputError) setInputError("");
                  }}
                  placeholder={getPlaceholder()}
                  className="flex-1 bg-transparent outline-none text-sm min-w-0"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  type={
                    collecting === "email" ? "email"
                    : collecting === "phone" ? "tel"
                    : "text"
                  }
                />
                <button
                  onClick={sendMessage}
                  className="w-8 h-8 flex-shrink-0 bg-[#5695D0] rounded-full text-white flex items-center justify-center hover:bg-[#286CAC] transition-colors"
                >
                  ↑
                </button>
              </div>
            </div>
            )}

            <div className="text-center text-xs mt-2 text-gray-500">
              Powered by <b className="text-gray-700">Printer Support</b>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrinterBot;