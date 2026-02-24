export function getDescendants(entities, id, out = new Set()) {
  const node = entities[id];
  if (!node) return out;
  for (const childId of node.childrenIds || []) {
    if (out.has(childId)) continue;
    out.add(childId);
    getDescendants(entities, childId, out);
  }
  return out;
}

export function getAncestorChain(entities, id) {
  const chain = [];
  let current = entities[id];
  while (current && current.parentId) {
    chain.push(current.parentId);
    current = entities[current.parentId];
  }
  return chain;
}

export function isLeaf(task) {
  return !task.childrenIds || task.childrenIds.length === 0;
}

