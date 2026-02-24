import React from "react";

export default function DragHandle({ listeners, attributes }) {
  return (
    <button className="drag-handle" type="button" {...listeners} {...attributes} aria-label="Drag task">
      ::
    </button>
  );
}

