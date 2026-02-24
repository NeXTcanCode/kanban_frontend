import { bucketFromPercentage } from "../constants/statusBuckets";

function ticketStatusFromPercentage(percentage) {
  return Number(percentage) >= 100 ? "Closed" : "Open";
}

export function clampPercentage(value) {
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value);
}

export function recalculateAncestors(state, startParentId) {
  let parentId = startParentId;
  while (parentId) {
    const parent = state.entities[parentId];
    if (!parent) break;
    const children = (parent.childrenIds || []).map((childId) => state.entities[childId]).filter(Boolean);
    if (children.length) {
      const avg = Math.round(children.reduce((acc, c) => acc + Number(c.percentage || 0), 0) / children.length);
      parent.percentage = avg;
      parent.statusBucket = bucketFromPercentage(avg);
      parent.ticketStatus = ticketStatusFromPercentage(avg);
    }
    parentId = parent.parentId;
  }
}

export function recalculateAllParents(state) {
  function compute(id) {
    const node = state.entities[id];
    if (!node) return 0;
    const children = (node.childrenIds || []).map((childId) => state.entities[childId]).filter(Boolean);
    if (!children.length) {
      const leafPercentage = Number(node.percentage || 0);
      node.statusBucket = bucketFromPercentage(leafPercentage);
      node.ticketStatus = ticketStatusFromPercentage(leafPercentage);
      return leafPercentage;
    }

    let sum = 0;
    for (const child of children) {
      sum += compute(child.id);
    }
    const avg = Math.round(sum / children.length);
    node.percentage = avg;
    node.statusBucket = bucketFromPercentage(avg);
    node.ticketStatus = ticketStatusFromPercentage(avg);
    return avg;
  }

  const roots = Object.values(state.entities).filter((task) => !task.parentId);
  for (const root of roots) compute(root.id);
}
