import React, { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import KanbanBoard from "./components/board/KanbanBoard";
import AuthPage from "./components/auth/AuthPage";
import AddUserModal from "./components/auth/AddUserModal";
import { addUserApi, getMeApi } from "./services/authApi";
import { clearAuthSession, getStoredToken, getStoredUser, setAuthSession } from "./services/authStorage";
import {
  clearAllNotificationsApi,
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  unreadNotificationsCountApi,
} from "./services/notificationsApi";
import { createSocketClient } from "./services/socketClient";

function initialsFromName(name) {
  const value = String(name || "").trim();
  if (!value) return "U";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    return token && user ? { token, user } : null;
  });
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberMessage, setMemberMessage] = useState("");
  const [memberError, setMemberError] = useState("");
  const [showBellModal, setShowBellModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const roleOptionsMap = {
    god: ["leader", "coleader", "elder", "member"],
    leader: ["coleader", "elder", "member"],
    coleader: ["elder", "member"],
    elder: ["member"]
  };

  useEffect(() => {
    if (!auth?.token) return;
    getMeApi()
      .then((user) => {
        setAuth((prev) => {
          if (!prev) return prev;
          const next = { ...prev, user };
          setAuthSession(prev.token, user);
          return next;
        });
      })
      .catch(() => {
        clearAuthSession();
        setAuth(null);
      });
  }, [auth?.token]);

  useEffect(() => {
    if (!auth?.token) return;
    unreadNotificationsCountApi()
      .then((count) => setUnreadCount(Number(count || 0)))
      .catch(() => setUnreadCount(0));
    listNotificationsApi()
      .then((items) => setNotifications(Array.isArray(items) ? items : []))
      .catch(() => setNotifications([]));
  }, [auth?.token]);

  useEffect(() => {
    if (!auth?.token) return undefined;
    const socket = createSocketClient(auth.token);
    socket.on("notification:new", (payload) => {
      const item = payload?.notification;
      if (item) {
        setNotifications((prev) => [item, ...prev]);
      }
      if (typeof payload?.unreadCount === "number") {
        setUnreadCount(payload.unreadCount);
      }
    });
    socket.on("notification:unread-count", (payload) => {
      if (typeof payload?.unreadCount === "number") {
        setUnreadCount(payload.unreadCount);
      }
    });
    return () => socket.disconnect();
  }, [auth?.token]);

  const canManageMembers = useMemo(() => {
    const role = auth?.user?.userRole;
    return ["god", "leader", "coleader", "elder"].includes(role);
  }, [auth]);
  const allowedRoleOptions = useMemo(() => roleOptionsMap[auth?.user?.userRole] || [], [auth?.user?.userRole]);

  function handleAuthSuccess(data) {
    setAuthSession(data.token, data.user);
    setAuth({ token: data.token, user: data.user });
  }

  function handleLogout() {
    clearAuthSession();
    setAuth(null);
    setShowMemberForm(false);
    setMemberError("");
    setMemberMessage("");
    setShowBellModal(false);
    setNotifications([]);
    setUnreadCount(0);
  }

  async function openBellModal() {
    setShowBellModal(true);
    try {
      const items = await listNotificationsApi();
      setNotifications(Array.isArray(items) ? items : []);
    } catch {
      setNotifications([]);
    }
  }

  async function handleReadNotification(notificationId) {
    try {
      await markNotificationReadApi(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore read errors in UI
    }
  }

  async function handleReadAllNotifications() {
    try {
      await markAllNotificationsReadApi();
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: now })));
      setUnreadCount(0);
    } catch {
      // ignore read all errors in UI
    }
  }

  async function handleClearAllNotifications() {
    try {
      await clearAllNotificationsApi();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // ignore clear errors in UI
    }
  }

  function formatNotificationTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  }

  async function handleAddMember(formData) {
    setMemberError("");
    setMemberMessage("");
    setMemberBusy(true);
    try {
      const actorRole = String(auth?.user?.userRole || "");
      const actorCompany = String(auth?.user?.company || "");
      const payload = {
        name: formData.name,
        company: actorRole === "god" ? formData.company : actorCompany,
        department: formData.department,
        designation: formData.designation,
        userName: formData.userName,
        employeeId: formData.employeeId,
        password: formData.password,
        userRole: allowedRoleOptions.includes(formData.userRole) ? formData.userRole : allowedRoleOptions[0] || "member"
      };
      const user = await addUserApi(payload);
      setMemberMessage(`${user.name} created as ${user.userRole}`);
      setShowMemberForm(false);
    } catch (err) {
      setMemberError(err?.response?.data?.message || "Failed to add user");
    } finally {
      setMemberBusy(false);
    }
  }

  if (!auth) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div>
      <header className="user-strip">
        <div className="user-left">
          <div className="avatar-circle">{initialsFromName(auth.user?.name)}</div>
          <div className="user-text">
            <strong>{auth.user?.name}</strong>
            <span>{auth.user?.userRole}</span>
          </div>
        </div>
        <div className="user-actions">
          {canManageMembers ? (
            <button
              className="btn secondary"
              onClick={() => {
                setMemberError("");
                setMemberMessage("");
                setShowMemberForm(true);
              }}
            >
              Add User
            </button>
          ) : null}
          <button
            className="icon-bell-btn"
            onClick={openBellModal}
            aria-label="Open notifications"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 ? <span className="bell-badge">{unreadCount}</span> : null}
          </button>
          <button className="btn" onClick={handleLogout}>
            Logout ↗
          </button>
        </div>
      </header>

      {canManageMembers ? (
      <AddUserModal
          open={showMemberForm}
          onClose={() => setShowMemberForm(false)}
          allowedRoleOptions={allowedRoleOptions}
          onSubmit={handleAddMember}
          busy={memberBusy}
          message={memberMessage}
          error={memberError}
          actorRole={auth?.user?.userRole || ""}
          actorCompany={auth?.user?.company || ""}
        />
      ) : null}

      <KanbanBoard userName={auth.user?.name || ""} currentUser={auth.user || null} />
      {showBellModal ? (
        <div className="modal-backdrop" onClick={() => setShowBellModal(false)}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-head">
              <h3 className="modal-title">Assignment Notifications</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleClearAllNotifications}
                  disabled={!notifications.length}
                >
                  Clear all
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleReadAllNotifications}
                  disabled={!unreadCount}
                >
                  Mark all read
                </button>
                <button className="btn secondary" type="button" onClick={() => setShowBellModal(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="notification-list">
              {notifications.length ? (
                notifications.map((item) => (
                  <div className={`notification-item ${item.readAt ? "is-read" : "is-unread"}`} key={item.id}>
                    <div className="notification-item-message">{item.message}</div>
                    <div className="notification-item-actions">
                      <span className="notification-meta">
                        {item.readAt ? "Read" : "Unread"} • {formatNotificationTime(item.createdAt)}
                      </span>
                      {!item.readAt ? (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => handleReadNotification(item.id)}
                        >
                          Mark as read
                        </button>
                      ) : null}
                    </div>
                    <div className="notification-task-meta">Task ref: {item.taskId}</div>
                  </div>
                ))
              ) : (
                <div className="helper">No assignment notifications yet.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
