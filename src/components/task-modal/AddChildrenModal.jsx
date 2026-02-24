import React, { useEffect, useState } from "react";
import { searchAssigneesApi } from "../../services/authApi";

export default function AddChildrenModal({ task, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState(task.company || "");
  const [department, setDepartment] = useState(task.department || "");
  const [assignedToEntries, setAssignedToEntries] = useState(() =>
    (task.assignedTo || []).map((label, index) => ({
      id: task.assignedToUserIds?.[index] || `legacy_${index}`,
      label
    }))
  );
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [percentage, setPercentage] = useState(String(task.percentage ?? 0));
  const [initialDate, setInitialDate] = useState(
    task.assignedDate ? String(task.assignedDate).slice(0, 10) : ""
  );
  const [finalDate, setFinalDate] = useState(
    task.dueDate ? String(task.dueDate).slice(0, 10) : ""
  );
  const [finalPercentage, setFinalPercentage] = useState(
    String(task.targetPercentage ?? task.finalPercentage ?? 100)
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const cleanCompany = String(company || "").trim();
    const cleanDepartment = String(department || "").trim();
    const query = String(assigneeQuery || "").trim();
    if (!cleanCompany || !cleanDepartment || !query) {
      setAssigneeOptions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      searchAssigneesApi({ company: cleanCompany, department: cleanDepartment, query })
        .then((items) => setAssigneeOptions(Array.isArray(items) ? items : []))
        .catch(() => setAssigneeOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [company, department, assigneeQuery]);

  function addAssignee(option) {
    if (!option?.id) return;
    setAssignedToEntries((prev) => {
      if (prev.some((entry) => String(entry.id) === String(option.id))) return prev;
      return [...prev, { id: option.id, label: option.label }];
    });
    setAssigneeQuery("");
    setAssigneeOptions([]);
  }

  function removeAssignee(id) {
    setAssignedToEntries((prev) => prev.filter((entry) => String(entry.id) !== String(id)));
  }

  function handleSubmit() {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Child name is required.");
      return;
    }
    if (!finalDate) {
      setError("Final date is required.");
      return;
    }
    if (String(finalPercentage).trim() === "") {
      setError("Final percentage is required.");
      return;
    }
    const initialNum = Number(percentage);
    const finalNum = Number(finalPercentage);
    if (!Number.isFinite(initialNum) || initialNum < 0 || initialNum > 100) {
      setError("Initial percentage must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(finalNum) || finalNum < 0 || finalNum > 100) {
      setError("Final percentage must be between 0 and 100.");
      return;
    }
    if (initialDate && new Date(finalDate) < new Date(initialDate)) {
      setError("Final date must be on or after initial date.");
      return;
    }
    setError("");
    onSubmit({
      name: cleanName,
      company: company.trim(),
      department: department.trim(),
      assignedTo: assignedToEntries.map((entry) => entry.label).filter(Boolean),
      assignedToUserIds: assignedToEntries
        .map((entry) => String(entry.id))
        .filter((id) => id && !id.startsWith("legacy_")),
      assignedBy: Array.isArray(task.assignedBy) ? task.assignedBy : [],
      percentage: Math.round(initialNum),
      initialDate: initialDate || null,
      assignedDate: initialDate || null,
      finalDate: finalDate || null,
      dueDate: finalDate || null,
      finalPercentage: Math.round(finalNum),
      targetPercentage: Math.round(finalNum),
    });
  }

  return (
    <div className="modal">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <h3 className="modal-title">Add Children: {task.name}</h3>
        <button type="button" className="btn secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="field">
        <label>Child Name</label>
        <input
          className="input"
          placeholder="Planning"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="create-task-company-dept-grid">
        <div className="field">
          <label>Company</label>
          <input
            className="input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Department</label>
          <input
            className="input"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Assigned To</label>
        <input
          className="input"
          value={assigneeQuery}
          onChange={(e) => setAssigneeQuery(e.target.value)}
          placeholder="Search assignees"
        />
        {assigneeOptions.length > 0 ? (
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
        {assignedToEntries.length > 0 ? (
          <div className="task-modal-suggestions">
            {assignedToEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="btn secondary"
                onClick={() => removeAssignee(entry.id)}
                title="Remove assignee"
              >
                {entry.label} x
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="create-task-progress-grid">
        <div className="field">
          <label>Initial (0-100)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={percentage}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setPercentage("");
                return;
              }
              const parsed = Number(value);
              if (Number.isFinite(parsed)) {
                setPercentage(String(Math.min(100, Math.max(0, parsed))));
              }
            }}
          />
        </div>
        <div className="field">
          <label>Initial Date</label>
          <input
            className="input"
            type="date"
            value={initialDate}
            onChange={(e) => {
              const value = e.target.value;
              setInitialDate(value);
              if (finalDate && value && new Date(finalDate) < new Date(value)) {
                setFinalDate(value);
              }
            }}
          />
        </div>
        <div className="field">
          <label>Final Date</label>
          <input
            className="input"
            type="date"
            min={initialDate || undefined}
            value={finalDate}
            onChange={(e) => setFinalDate(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Final (0-100)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={finalPercentage}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setFinalPercentage("");
                return;
              }
              const parsed = Number(value);
              if (Number.isFinite(parsed)) {
                setFinalPercentage(String(Math.min(100, Math.max(0, parsed))));
              }
            }}
            required
          />
        </div>
      </div>
      {error ? <p className="helper" style={{ color: "#b4412f" }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" onClick={handleSubmit}>
          Add Child
        </button>
      </div>
    </div>
  );
}
