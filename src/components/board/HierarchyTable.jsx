import React from "react";
import TaskRow from "./TaskRow";

export default function HierarchyTable({
  rows,
  entities,
  expandedRowIds,
  onToggleExpand,
  onOpenTask,
  onDeleteTask,
  onAddChildren,
  canDeleteTask
}) {
  return (
    <div className="status-body">
      {rows.map((row, index) => {
        const task = entities[row.id];
        if (!task) return null;
        return (
          <TaskRow
            key={`${task.id}:${row.depth}:${index}`}
            task={task}
            depth={row.depth}
            expanded={Boolean(expandedRowIds[task.id])}
            onToggle={() => onToggleExpand(task.id)}
            onOpen={() => onOpenTask(task.id)}
            onDelete={() => onDeleteTask(task.id)}
            onAddChildren={() => onAddChildren(task.id)}
            canDelete={canDeleteTask ? canDeleteTask(task) : true}
          />
        );
      })}
    </div>
  );
}
