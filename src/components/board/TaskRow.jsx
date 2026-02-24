import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import RowExpander from "./RowExpander";
import DragHandle from "./DragHandle";

export default function TaskRow({ task, depth, expanded, onToggle, onOpen, onDelete, onAddChildren, canDelete = true }) {
  const drag = useDraggable({
    id: `task:${task.id}`,
    data: { kind: "task", taskId: task.id, parentId: task.parentId, bucket: task.statusBucket }
  });
  const drop = useDroppable({
    id: `row:${task.id}`,
    data: { kind: "row", taskId: task.id, parentId: task.parentId, bucket: task.statusBucket }
  });

  const indentClass = `indent-${Math.min(depth, 5)}`;
  const isDragging = drag.isDragging;
  const style = {
    opacity: isDragging ? 0.5 : 1
  };

  const setRefs = (node) => {
    drop.setNodeRef(node);
    drag.setNodeRef(node);
  };

  function summarizeNames(list, limit = 2) {
    const values = (list || []).filter(Boolean);
    if (!values.length) return "-";
    if (values.length <= limit) return values.join(", ");
    return `${values.slice(0, limit).join(", ")} +${values.length - limit}`;
  }
  function formatDateDDMMYYYY(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  }

  const assignees = summarizeNames(task.assignedTo, 2);
  const assignedBy = summarizeNames(task.assignedBy, 2);
  const assigneesFull = (task.assignedTo || []).join(", ") || "-";
  const assignedByFull = (task.assignedBy || []).join(", ") || "-";
  const hasDueDate = Boolean(task.dueDate);
  const parsedTarget = Number(task.targetPercentage ?? task.finalPercentage);
  const targetPercentage = Number.isFinite(parsedTarget) ? parsedTarget : 100;
  const hasFinalPercentage = Number.isFinite(Number(targetPercentage));
  const dueDate = hasDueDate ? new Date(task.dueDate) : null;
  const isValidDueDate = dueDate && !Number.isNaN(dueDate.getTime());
  const dueDayLocal = isValidDueDate
    ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    : null;
  const todayLocal = new Date();
  const todayStartLocal = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
  const isTargetMissedLate =
    Boolean(dueDayLocal) &&
    hasFinalPercentage &&
    todayStartLocal.getTime() > dueDayLocal.getTime() &&
    Number(task.percentage) < Number(targetPercentage);
  const overdueClass = isTargetMissedLate ? "row-card-overdue" : "";
  const ticketStatus = task.ticketStatus || "Open";
  const isClosedStatus = String(ticketStatus).trim().toLowerCase() === "closed";
  const completeClass = isClosedStatus ? "row-card-complete" : "";
  const ticketStatusClass = isClosedStatus ? "task-status-chip is-closed" : "task-status-chip is-open";

  return (
    <motion.div
      ref={setRefs}
      className={`row-card ${overdueClass} ${completeClass} ${indentClass}`}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      layout
    >
      <div className="row-top">
        <div>
          <DragHandle listeners={drag.listeners} attributes={drag.attributes} />
        </div>
        <div>
          <div className="task-name">{task.name}</div>
          <div className="task-meta">
            {task.department || "General"} • <span className={ticketStatusClass}>{ticketStatus}</span>
          </div>
          <div className="task-meta">Target: {targetPercentage}%</div>
          <div className="task-meta">Due: {formatDateDDMMYYYY(task.dueDate)}</div>
          <div className="task-meta" title={assigneesFull}>Assignee: {assignees}</div>
          <div className="task-meta" title={assignedByFull}>Assigned by: {assignedBy}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onAddChildren}
            aria-label={`Add children to ${task.name}`}
            title="Add children"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" />
            </svg>
          </button>
          <button type="button" className="icon-btn" onClick={onOpen} aria-label={`Edit ${task.name}`} title="Edit">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20h4l10-10-4-4L4 16v4zm14.7-11.3a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0l-1.2 1.2 4 4 1.6-1.8z" />
            </svg>
          </button>
          {canDelete ? (
            <button
              type="button"
              className="icon-btn danger"
              onClick={onDelete}
              aria-label={`Delete ${task.name}`}
              title="Delete"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
              </svg>
            </button>
          ) : null}
        </div>
        <RowExpander
          hasChildren={Boolean(task.childrenIds?.length)}
          expanded={expanded}
          onToggle={onToggle}
        />
      </div>
      <div className="row-bottom">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${task.percentage}%` }} />
        </div>
        <span className="percent-pill">{task.percentage}%</span>
      </div>
    </motion.div>
  );
}
