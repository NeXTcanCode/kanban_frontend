import React from "react";

export default function CreateTaskModal({
  values,
  onChange,
  onSelectAssignee,
  assigneeOptions = [],
  assigneeLoading = false,
  companyOptions = [],
  departmentOptions = [],
  onClose,
  onCreate,
  onClear,
}) {
  return (
    <div className="modal">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <h3 className="modal-title">Create Task</h3>
        <button type="button" className="btn secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="field">
        <label>New Task Name</label>
        <input
          className="input"
          placeholder="Task name"
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </div>

      <div className="create-task-company-dept-grid">
        <div className="field">
          <label>Company Name</label>
          <input
            className="input"
            placeholder="Company name"
            value={values.company}
            onChange={(e) => onChange("company", e.target.value)}
            list="company-options"
          />
          <datalist id="company-options">
            {companyOptions.map((company) => (
              <option key={company} value={company} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label>Department</label>
          <input
            className="input"
            placeholder="Department"
            value={values.department}
            onChange={(e) => onChange("department", e.target.value)}
            list="department-options"
          />
          <datalist id="department-options">
            {departmentOptions.map((department) => (
              <option key={department} value={department} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="field">
        <label>Assignee (name, employeeId, userName)</label>
        <input
          className="input"
          placeholder="Search assignee"
          value={values.assignedTo}
          onChange={(e) => onChange("assignedTo", e.target.value)}
        />
        {assigneeLoading ? <div className="helper">Searching assignees...</div> : null}
        {assigneeOptions.length > 0 ? (
          <div className="assignee-dropdown">
            {assigneeOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className="assignee-option"
                onClick={() => onSelectAssignee(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="field">
        <label>Assigned By (comma separated)</label>
        <input
          className="input"
          placeholder="VP"
          value={values.assignedBy}
          onChange={(e) => onChange("assignedBy", e.target.value)}
        />
      </div>

      <div className="create-task-progress-grid">
        <div className="field">
          <label>Initial (0-100)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            step={1}
            value={values.percentage}
            onChange={(e) => onChange("percentage", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Initial Date</label>
          <input
            className="input"
            type="date"
            value={values.initialDate}
            onChange={(e) => onChange("initialDate", e.target.value)}
          />
        </div>

        <div className="field">
          <label>Final Date</label>
          <input
            className="input"
            type="date"
            value={values.finalDate}
            min={values.initialDate || undefined}
            onChange={(e) => onChange("finalDate", e.target.value)}
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
            step={1}
            value={values.finalPercentage}
            onChange={(e) => onChange("finalPercentage", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label>Children Names (comma separated)</label>
        <input
          className="input"
          placeholder="Landing Page, Ad Copy"
          value={values.children}
          onChange={(e) => onChange("children", e.target.value)}
        />
      </div>

      <div className="modal-btn-wrap" style={{ display: "flex", gap: 12 }}>
        <button type="button" className="btn secondary" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="btn" onClick={onCreate}>
          Add Task
        </button>
      </div>
    </div>
  );
}
