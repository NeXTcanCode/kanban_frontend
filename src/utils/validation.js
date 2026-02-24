import { getDescendants } from "./hierarchy";

export function canReparent(entities, nodeId, parentCandidateId) {
  if (nodeId === parentCandidateId) return false;
  if (!parentCandidateId) return true;
  const descendants = getDescendants(entities, nodeId);
  return !descendants.has(parentCandidateId);
}

