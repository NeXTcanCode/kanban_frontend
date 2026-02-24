import React from "react";

export default function ReparentSelector({ options, value, setValue, onSave }) {
  return (
    <div className="field">
      <label>Nest Under</label>
      <select className="select" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">No Parent (Root)</option>
        {options.map((task) => (
          <option key={task.id} value={task.id}>
            {task.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn secondary" onClick={onSave}>
        Save Parent
      </button>
    </div>
  );
}

