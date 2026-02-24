import React from "react";

export default function PercentageEditor({ value, setValue, onSave, disabled }) {
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return (
    <div className="field percent-editor">
      <label>Completion Percentage</label>
      <div className="percent-row">
        <input
          className="input percent-input"
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        />
        <input
          className="percent-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={numericValue}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          aria-label="Percentage slider"
        />
        <button type="button" className="btn percent-save-btn" onClick={onSave} disabled={disabled}>
          Save Percentage
        </button>
      </div>
      {disabled ? <span className="helper">Parent percentage is derived from children.</span> : null}
    </div>
  );
}
