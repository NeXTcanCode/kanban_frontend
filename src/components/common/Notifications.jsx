import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Notifications({ items, onClose, position = "right" }) {
  if (!items.length) return null;
  const sideStyle = position === "left" ? { left: 16 } : { right: 16 };
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        zIndex: 100,
        display: "grid",
        gap: 8,
        width: "min(360px, 92vw)",
        ...sideStyle
      }}
    >
      <AnimatePresence initial={false}>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            border: "1px solid var(--line)",
            background: "#fffaf0",
            borderRadius: 12,
            boxShadow: "0 10px 20px rgba(10,10,10,0.12)",
            padding: 10
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
          {item.message ? <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>{item.message}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            {item.actions?.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`btn ${action.variant === "secondary" ? "secondary" : ""}`}
                style={{ minHeight: 30, padding: "0 10px" }}
                onClick={() => action.onClick?.()}
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              className="btn secondary"
              style={{ minHeight: 30, padding: "0 10px" }}
              onClick={() => onClose(item.id)}
            >
              Close
            </button>
          </div>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  );
}
