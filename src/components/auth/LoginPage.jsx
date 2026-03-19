import { useState } from "react";
import Icon from "../dashboard/Icon";
import { apiFetch, setToken, setRole, setUser } from "../../lib/api";
import { FALLBACK_USERS, API_ENABLED } from "../../lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
// Single login form for both Admin and Agent.
// After login calls onLogin(user) → App.jsx redirects to /dashboard/:role
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Minimum 6 characters";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);

    // ── Try real API ────────────────────────────────────────────────────
    if (API_ENABLED) {
      try {
        const data = await apiFetch("/api/auth/login", {
          method: "POST",
          body:   JSON.stringify({ email, password }),
        });

        // data = { success, token, user: { _id, name, email, role, ... } }
        const userObj = {
          ...data.user,
          id:           data.user._id || data.user.id,
          emailDisplay: email,
          fromApi:      true,
        };

        // Persist to localStorage so refresh works
        setToken(data.token);
        setRole(data.user.role);
        setUser(userObj);

        setLoading(false);
        onLogin(userObj);
        return;
      } catch (err) {
        console.warn("[API] Login failed, using fallback:", err.message);
      }
    }

    // ── Static fallback (if API is down) ────────────────────────────────
    const match = FALLBACK_USERS.find(
      (u) => u.email === email && u.password === password
    );
    if (!match) {
      setErrors({ password: "Invalid email or password" });
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const userObj = {
        ...match,
        id:           `fallback-${match.role}`,
        emailDisplay: email,
        fromApi:      false,
      };
      setToken("fallback-token");
      setRole(match.role);
      setUser(userObj);
      setLoading(false);
      onLogin(userObj);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-200">
              <Icon name="phone" cls="w-5 h-5 text-white"/>
            </div>
            <div>
              <span className="block text-lg font-bold text-gray-900 leading-tight">Printer</span>
              <span className="block text-lg font-bold text-blue-500 leading-tight -mt-1">Support</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100 p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to your dashboard</p>
          </div>

          {/* Role hint badges */}
          <div className="flex gap-2 mb-6">
            <span className="flex items-center gap-1.5 text-xs font-medium bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-full">
              Admin
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full">
              Agent
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: "" })); }}
                placeholder="you@example.com"
                className={`w-full h-11 border rounded-xl px-4 text-sm outline-none transition ${
                  errors.email
                    ? "border-red-300 bg-red-50 focus:ring-1 focus:ring-red-300"
                    : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                }`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: "" })); }}
                  placeholder="••••••••"
                  className={`w-full h-11 border rounded-xl px-4 pr-11 text-sm outline-none transition ${
                    errors.password
                      ? "border-red-300 bg-red-50 focus:ring-1 focus:ring-red-300"
                      : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon name={showPass ? "eyeOff" : "eye"} cls="w-4 h-4"/>
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-11 rounded-xl text-sm font-semibold text-white transition mt-2 ${
                loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 active:scale-[0.98]"
              }`}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

          </form>
        </div>

        {/* Dev hint */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Admin: admin@yoursite.com · Agent: agent1@support.com
        </p>

      </div>
    </div>
  );
}