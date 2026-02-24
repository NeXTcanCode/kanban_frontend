import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import HierarchyTable from "./HierarchyTable";

export default function StatusSection({
  status,
  rows,
  entities,
  expandedRowIds,
  onToggleExpand,
  onOpenTask,
  onDeleteTask,
  onAddChildren,
  canDeleteTask
}) {
  const drop = useDroppable({
    id: `bucket:${status}`,
    data: { kind: "bucket", bucket: status }
  });

  return (
    <motion.section
      ref={drop.setNodeRef}
      className="status-col"
      data-status={status}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <header className="status-head">
        <span className="status-label">
          <span className="status-dot" />
          {status}
        </span>
        <span className="count-chip">{rows.length}</span>
      </header>
      <HierarchyTable
        rows={rows}
        entities={entities}
        expandedRowIds={expandedRowIds}
        onToggleExpand={onToggleExpand}
        onOpenTask={onOpenTask}
        onDeleteTask={onDeleteTask}
        onAddChildren={onAddChildren}
        canDeleteTask={canDeleteTask}
      />
    </motion.section>
  );
}
