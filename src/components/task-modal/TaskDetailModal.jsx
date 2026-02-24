import React, { useState, useMemo, useEffect } from "react";
import PercentageEditor from "./PercentageEditor";
import ReparentSelector from "./ReparentSelector";
import ChildPriorityList from "./ChildPriorityList";
import { canReparent } from "../../utils/validation";
import { searchAssigneesApi } from "../../services/authApi";

export default function TaskDetailModal({
  task,
  currentUser,
  allTasks,
  entities,
  onClose,
  onSavePercentage,
  onSavePeople,
  onSaveTimeline,
  onAddManualComment,
  onViewLogs,
  onReparent,
  onReorderChild,
  onMoveChild,
}) {
  const ROLE_RANK = {
    god: 5,
    leader: 4,
    coleader: 3,
    elder: 2,
    member: 1,
  };
  const role = String(currentUser?.userRole || "").trim();
  const roleRank = ROLE_RANK[role] || 0;
  const canManageAll = role === "god" || role === "leader";
  const canSavePeople = canManageAll || role === "coleader" || role === "elder";
  const canSaveTimeline = canManageAll;
  const canReparentTask = canManageAll;
  const [percentage, setPercentage] = useState(String(task.percentage));
  const [parentId, setParentId] = useState(task.parentId || "");
  const [assignedToEntries, setAssignedToEntries] = useState(() =>
    (task.assignedTo || []).map((label, index) => ({
      id: task.assignedToUserIds?.[index] || `legacy_${index}`,
      label,
    }))
  );
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assignedByText, setAssignedByText] = useState(
    (task.assignedBy || []).join(", ")
  );
  const [assignedDate, setAssignedDate] = useState(
    task.assignedDate ? String(task.assignedDate).slice(0, 10) : ""
  );
  const [dueDate, setDueDate] = useState(
    task.dueDate ? String(task.dueDate).slice(0, 10) : ""
  );
  const [commentName, setCommentName] = useState(String(currentUser?.name || ""));
  const [commentEmployeeId, setCommentEmployeeId] = useState(String(currentUser?.employeeId || ""));
  const [commentMessage, setCommentMessage] = useState("");

  const isParent = Boolean(task.childrenIds?.length);
  const parentOptions = useMemo(
    () =>
      allTasks.filter((candidate) =>
        canReparent(entities, task.id, candidate.id)
      ),
    [allTasks, entities, task.id]
  );
  const childTasks = (task.childrenIds || [])
    .map((id) => entities[id])
    .filter(Boolean);
  const moveTargets = allTasks.filter(
    (candidate) =>
      candidate.id !== task.id && !task.childrenIds.includes(candidate.id)
  );
  const canRemoveAssignee = useMemo(() => {
    if (!canSavePeople) return false;
    if (role === "god") return true;
    const assignerId = String(task.assignedByUserId || "").trim();
    const assignerRole = String(task.assignedByRole || "").trim();
    const assignerRank = ROLE_RANK[assignerRole] || 0;
    const currentUserId = String(currentUser?.id || "").trim();
    if (!assignerId || !assignerRank) return false;
    return currentUserId === assignerId || roleRank > assignerRank;
  }, [canSavePeople, role, roleRank, task.assignedByUserId, task.assignedByRole, currentUser?.id]);

  useEffect(() => {
    setAssignedByText((task.assignedBy || []).join(", "));
  }, [task.assignedBy]);

  useEffect(() => {
    setCommentName(String(currentUser?.name || ""));
    setCommentEmployeeId(String(currentUser?.employeeId || ""));
  }, [currentUser?.name, currentUser?.employeeId]);

  useEffect(() => {
    const company = String(task.company || "").trim();
    const department = String(task.department || "").trim();
    const query = String(assigneeQuery || "").trim();
    if (!company || !department || !query) {
      setAssigneeOptions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      searchAssigneesApi({ company, department, query })
        .then((items) => setAssigneeOptions(Array.isArray(items) ? items : []))
        .catch(() => setAssigneeOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [task.company, task.department, assigneeQuery]);

  function addAssignee(option) {
    if (!option?.id) return;
    setAssignedToEntries((prev) => {
      if (prev.some((item) => String(item.id) === String(option.id))) return prev;
      return [...prev, { id: option.id, label: option.label }];
    });
    setAssigneeQuery("");
    setAssigneeOptions([]);
  }

  function removeAssignee(id) {
    if (!canRemoveAssignee) return;
    if (String(id) === String(currentUser?.id || "")) return;
    setAssignedToEntries((prev) => prev.filter((item) => String(item.id) !== String(id)));
  }

  return (
    <div className="modal">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <h3 className="modal-title">{task.name}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn secondary" onClick={onViewLogs}>
            View Logs
          </button>
          <button type="button" className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <PercentageEditor
        value={percentage}
        setValue={setPercentage}
        disabled={isParent}
        onSave={() => onSavePercentage(task.id, percentage)}
      />

      <div className="field">
        <label>Assignees</label>
        <input
          className="input"
          value={assigneeQuery}
          onChange={(e) => setAssigneeQuery(e.target.value)}
          placeholder="Search assignees"
          disabled={!canSavePeople}
        />
        {canSavePeople && assigneeOptions.length > 0 ? (
          <div className="task-modal-suggestions">
            {assigneeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="btn secondary"
                onClick={() => addAssignee(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {assignedToEntries.length ? (
          <div className="task-modal-suggestions">
            {assignedToEntries.map((entry) => {
              const isSelf = String(entry.id) === String(currentUser?.id || "");
              const canRemoveThis = canRemoveAssignee && !isSelf;
              return (
              <button
                key={entry.id}
                type="button"
                className="btn secondary"
                disabled={!canRemoveThis}
                onClick={() => removeAssignee(entry.id)}
                title={
                  isSelf
                    ? "You cannot remove yourself from assignees"
                    : canRemoveAssignee
                      ? "Remove assignee"
                      : "You can only add assignees"
                }
              >
                {entry.label} {canRemoveThis ? "x" : ""}
              </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="field">
        <label>Assigned By (comma separated)</label>
        <input
          className="input"
          value={assignedByText}
          onChange={(e) => setAssignedByText(e.target.value)}
          placeholder="Manager 1"
          disabled
        />
      </div>
      <div className="modal-btn-wrap">
        <button
          type="button"
          className="btn secondary"
          disabled={!canSavePeople}
          onClick={() =>
            onSavePeople(
              task.id,
              assignedToEntries.map((entry) => entry.label).filter(Boolean),
              assignedToEntries
                .map((entry) => String(entry.id))
                .filter((id) => id && !id.startsWith("legacy_"))
            )
          }
        >
          Save People
        </button>
      </div>

      <div className="modal-date-grid">
        <div className="field">
          <label>Assigned Date</label>
          <input
            className="input"
            type="date"
            value={assignedDate}
            onChange={(e) => setAssignedDate(e.target.value)}
            disabled={!canSaveTimeline}
          />
        </div>
        <div className="field">
          <label>Final Date</label>
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!canSaveTimeline}
          />
        </div>
      </div>
      <div className="modal-btn-wrap">
        <button
          type="button"
          className="btn secondary"
          disabled={!canSaveTimeline}
          onClick={() =>
            onSaveTimeline(task.id, assignedDate || null, dueDate || null)
          }
        >
          Save Timeline
        </button>
      </div>

      <div className="field">
        <label>Manual Comment Name</label>
        <input
          className="input"
          value={commentName}
          onChange={() => {}}
          placeholder="Your name"
          readOnly
        />
      </div>
      <div className="field">
        <label>Employee ID</label>
        <input
          className="input"
          value={commentEmployeeId}
          onChange={() => {}}
          placeholder="EMP-123"
          readOnly
        />
      </div>
      <div className="field">
        <label>Message</label>
        <input
          className="input"
          value={commentMessage}
          onChange={(e) => setCommentMessage(e.target.value)}
          placeholder="Write your comment"
        />
      </div>
      <div className="modal-btn-wrap">
        <button
          type="button"
          className="btn"
          onClick={() => {
            onAddManualComment(
              task.id,
              commentName,
              commentEmployeeId,
              commentMessage
            );
            setCommentMessage("");
          }}
        >
          Add Comment
        </button>
      </div>

      {canReparentTask ? (
        <ReparentSelector
          options={parentOptions}
          value={parentId}
          setValue={setParentId}
          onSave={() => onReparent(task.id, parentId || null)}
        />
      ) : null}

      {canReparentTask ? (
        <ChildPriorityList
          childTasks={childTasks}
          moveTargets={moveTargets}
          onMoveUp={(index) => onReorderChild(task.id, index, index - 1)}
          onMoveDown={(index) => onReorderChild(task.id, index, index + 1)}
          onMoveChild={(childId, toParentId) =>
            onMoveChild(childId, toParentId === "__ROOT__" ? null : toParentId)
          }
        />
      ) : null}
    </div>
  );
}
