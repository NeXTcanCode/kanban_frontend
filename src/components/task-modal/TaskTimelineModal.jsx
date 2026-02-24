import React, { useMemo } from "react";

function formatTimelineDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function buildExportRows(task, logs) {
  const rows = ["date,type,name,employeeId,message"];
  for (const log of logs) {
    const safe = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    rows.push(
      [
        safe(formatTimelineDate(log.createdAt)),
        safe(log.type),
        safe(log.name || ""),
        safe(log.employeeId || ""),
        safe(log.message || "")
      ].join(",")
    );
  }
  return rows.join("\n");
}

export default function TaskTimelineModal({ task, onClose, pushNotification }) {
  const logs = useMemo(() => {
    return [...(task.comments || [])].sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTs - bTs;
    });
  }, [task.comments]);

  function copyTimeline() {
    const text = logs
      .map((log) => `${formatTimelineDate(log.createdAt)} - ${log.message} (${log.type})`)
      .join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => pushNotification({ title: "Copied", message: "Timeline copied to clipboard" }))
      .catch(() => pushNotification({ title: "Copy Failed", message: "Could not copy timeline" }));
  }

  function exportCsv() {
    const csv = buildExportRows(task, logs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.name.replaceAll(/\s+/g, "_")}_timeline.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushNotification({ title: "Exported", message: "Timeline CSV downloaded" });
  }

  return (
    <div className="timeline-modal-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 className="modal-title">{task.name} Timeline</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn secondary" onClick={copyTimeline}>
            Copy
          </button>
          <button type="button" className="btn secondary" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="field">
        <label>Timeline (DD/MM/YYYY HH:mm)</label>
        <div style={{ display: "grid", gap: 8, maxHeight: "70vh", overflow: "auto", paddingRight: 4 }}>
          {logs.map((log, index) => (
            <div
              key={`${task.id}_timeline_${index}`}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 12px",
                background: "#fffdfa",
                display: "grid",
                gridTemplateColumns: "180px 18px 1fr",
                alignItems: "start",
                gap: 6
              }}
            >
              <div style={{ fontWeight: 700 }}>{formatTimelineDate(log.createdAt)}</div>
              <div style={{ textAlign: "center", color: "#8b7c5f" }}>-</div>
              <div style={{ color: log.type === "manual" ? "#8f1d1d" : "#1b6b2f" }}>
                <div style={{ fontWeight: 700 }}>
                  {log.type === "manual" ? "Manual" : "Auto"} • {log.name || "System"}{" "}
                  {log.employeeId ? `(${log.employeeId})` : ""}
                </div>
                <div>{log.message}</div>
              </div>
            </div>
          ))}
          {!logs.length ? <div className="helper">No timeline events yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

