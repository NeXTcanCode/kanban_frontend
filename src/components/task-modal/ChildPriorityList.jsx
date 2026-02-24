import React from "react";

export default function ChildPriorityList({ childTasks, onMoveUp, onMoveDown, moveTargets, onMoveChild }) {
  if (!childTasks.length) return null;
  return (
    <div className="field">
      <label>Child Priority & Move</label>
      {childTasks.map((child, index) => (
        <div key={child.id} style={{ display: "grid", gap: 8, border: "1px solid var(--line)", borderRadius: 10, padding: 8 }}>
          <strong>{child.name}</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn secondary" onClick={() => onMoveUp(index)} disabled={index === 0}>
              Up
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => onMoveDown(index)}
              disabled={index === childTasks.length - 1}
            >
              Down
            </button>
            <select
              className="select"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                onMoveChild(child.id, e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Move child to...</option>
              <option value="__ROOT__">Root</option>
              {moveTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

