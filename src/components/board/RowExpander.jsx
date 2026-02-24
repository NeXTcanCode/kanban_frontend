import React from "react";

export default function RowExpander({ expanded, onToggle, hasChildren }) {
  if (!hasChildren) return <span style={{ width: 22, display: "inline-block" }} />;
  return (
    <button type="button" className="btn secondary" style={{ minHeight: 24, padding: "0 8px" }} onClick={onToggle}>
      {expanded ? "-" : "+"}
    </button>
  );
}

