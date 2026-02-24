import React, { useMemo, useState } from "react";
import { loginApi, signupApi } from "../../services/authApi";

const DEFAULT_SIGNUP = {
  name: "",
  company: "",
  designation: "",
  userName: "",
  employeeId: "",
  password: "",
  userRole: "member"
};

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginForm, setLoginForm] = useState({ userId: "", password: "" });
  const [signupForm, setSignupForm] = useState(DEFAULT_SIGNUP);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const title = useMemo(() => (mode === "login" ? "Login" : "Signup"), [mode]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await loginApi(loginForm);
      onAuthSuccess(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await signupApi(signupForm);
      onAuthSuccess(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={`btn ${mode === "login" ? "" : "secondary"}`} onClick={() => setMode("login")}>Login</button>
          <button className={`btn ${mode === "signup" ? "" : "secondary"}`} onClick={() => setMode("signup")}>Signup</button>
        </div>
        <h2 className="auth-title">{title}</h2>
        {error ? <p className="auth-error">{error}</p> : null}

        {mode === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <input
              className="input"
              placeholder="userId"
              value={loginForm.userId}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, userId: e.target.value }))}
              required
            />
            <div className="password-row">
              <input
                className="input"
                type={showLoginPassword ? "text" : "password"}
                placeholder="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
              <button
                type="button"
                className="btn secondary eye-btn"
                onClick={() => setShowLoginPassword((v) => !v)}
              >
                {showLoginPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button className="btn" type="submit" disabled={busy}>{busy ? "Please wait..." : "Login"}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <input className="input" placeholder="Name" value={signupForm.name} onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="input" placeholder="Company (optional)" value={signupForm.company} onChange={(e) => setSignupForm((p) => ({ ...p, company: e.target.value }))} />
            <input className="input" placeholder="Designation (optional)" value={signupForm.designation} onChange={(e) => setSignupForm((p) => ({ ...p, designation: e.target.value }))} />
            <input className="input" placeholder="userName" value={signupForm.userName} onChange={(e) => setSignupForm((p) => ({ ...p, userName: e.target.value }))} required />
            <input className="input" placeholder="Employee ID (optional)" value={signupForm.employeeId} onChange={(e) => setSignupForm((p) => ({ ...p, employeeId: e.target.value }))} />
            <div className="password-row">
              <input
                className="input"
                type={showSignupPassword ? "text" : "password"}
                placeholder="password"
                value={signupForm.password}
                onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
              <button
                type="button"
                className="btn secondary eye-btn"
                onClick={() => setShowSignupPassword((v) => !v)}
              >
                {showSignupPassword ? "Hide" : "Show"}
              </button>
            </div>
            <select className="select" value={signupForm.userRole} onChange={(e) => setSignupForm((p) => ({ ...p, userRole: e.target.value }))}>
              <option value="god">God (Super Admin)</option>
              <option value="leader">Leader (Manager)</option>
              <option value="coleader">CoLeader (Team Lead)</option>
              <option value="elder">Elder (Senior)</option>
              <option value="member">Member (Contributor)</option>
            </select>
            <button className="btn" type="submit" disabled={busy}>{busy ? "Please wait..." : "Signup"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
