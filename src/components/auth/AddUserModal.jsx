import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const EMPTY_MEMBER_FORM = {
  name: "",
  company: "",
  department: "",
  designation: "",
  userName: "",
  employeeId: "",
  password: "",
  userRole: "member"
};

export default function AddUserModal({
  open,
  onClose,
  allowedRoleOptions,
  onSubmit,
  busy,
  message,
  error,
  actorRole = "",
  actorCompany = ""
}) {
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setMemberForm(EMPTY_MEMBER_FORM);
      setShowPassword(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMemberForm((prev) => ({
      ...prev,
      userRole: allowedRoleOptions[0] || "member",
      company: actorRole === "god" ? prev.company : actorCompany
    }));
  }, [open, allowedRoleOptions, actorRole, actorCompany]);

  const selectedRole = useMemo(() => {
    if (allowedRoleOptions.includes(memberForm.userRole)) return memberForm.userRole;
    return allowedRoleOptions[0] || "member";
  }, [allowedRoleOptions, memberForm.userRole]);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      ...memberForm,
      userRole: selectedRole
    });
  }

  function handleClear() {
    setMemberForm(EMPTY_MEMBER_FORM);
    setShowPassword(false);
  }

  return (
    <AnimatePresence>
      {open ? (
    <motion.div
      className="modal-backdrop add-user-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <motion.section
        className="add-user-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="add-user-head">
          <div>
            <h3 className="modal-title">Add Team Member</h3>
            <p className="helper">Create a new account and assign a role in one step.</p>
          </div>
          <button type="button" className="add-user-icon-btn add-user-close-btn" onClick={onClose} aria-label="Close add user modal" title="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.7 5.3a1 1 0 0 0-1.4 1.4L10.6 12l-5.3 5.3a1 1 0 1 0 1.4 1.4l5.3-5.3 5.3 5.3a1 1 0 0 0 1.4-1.4L13.4 12l5.3-5.3a1 1 0 1 0-1.4-1.4L12 10.6 6.7 5.3Z" />
            </svg>
          </button>
        </div>

        <form id="add-user-form" className="add-user-form" onSubmit={handleSubmit}>
          <input className="input" placeholder="Name" value={memberForm.name} onChange={(e) => setMemberForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="input" placeholder="Username" value={memberForm.userName} onChange={(e) => setMemberForm((p) => ({ ...p, userName: e.target.value }))} required />
          <input
            className="input"
            placeholder={actorRole === "god" ? "Company (required for scoped org users)" : "Company"}
            value={actorRole === "god" ? memberForm.company : actorCompany}
            onChange={(e) => setMemberForm((p) => ({ ...p, company: e.target.value }))}
            disabled={actorRole !== "god"}
            required={actorRole === "god"}
          />
          <input className="input" placeholder="Department (optional)" value={memberForm.department} onChange={(e) => setMemberForm((p) => ({ ...p, department: e.target.value }))} />
          <input className="input" placeholder="Designation (optional)" value={memberForm.designation} onChange={(e) => setMemberForm((p) => ({ ...p, designation: e.target.value }))} />
          <input className="input" placeholder="Employee ID (optional)" value={memberForm.employeeId} onChange={(e) => setMemberForm((p) => ({ ...p, employeeId: e.target.value }))} />
          <select
            className="select add-user-role-field"
            value={selectedRole}
            onChange={(e) => setMemberForm((p) => ({ ...p, userRole: e.target.value }))}
            disabled={!allowedRoleOptions.length}
          >
            {allowedRoleOptions.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
          <div className="add-user-password-row">
            <input
              className="input add-user-password-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={memberForm.password}
              onChange={(e) => setMemberForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <button
              type="button"
              className="add-user-eye-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>

          <div className="add-user-form-actions">
            <button type="button" className="btn secondary add-user-clear-btn" onClick={handleClear} disabled={busy}>
              Clear
            </button>
            <button type="submit" className="btn add-user-submit-btn" disabled={busy || !allowedRoleOptions.length}>
              {busy ? "Adding..." : "Add"}
            </button>
          </div>
        </form>

        {message ? <p className="auth-success">{message}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
      </motion.section>
    </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
