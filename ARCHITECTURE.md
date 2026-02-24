# Frontend Architecture: Hierarchical Row-Based Kanban Board

## Overview

This document defines the frontend architecture for a hierarchical, row-based Kanban board where tasks can have parent/child relationships, ordered priority among siblings, and derived status buckets based on percentage completion. The design prioritizes predictable state transitions, scalable rendering for large datasets, and consistent business rules shared with backend APIs.

## Latest Update (February 17, 2026, 3:36 AM)

The frontend architecture now operates as an auth-first application shell layered over the Kanban board. A unified auth page supports login and signup in one flow, including password visibility toggles and role selection at registration. Session persistence is handled through local storage utilities, and Axios request interception automatically injects bearer tokens for protected API calls. App composition now conditionally renders either auth UI or board UI based on validated session state. A signed-in user strip was introduced with avatar initials, role label, and logout action. Role-aware user creation UI was added with dynamic options aligned to backend policy, and board branding is personalized to render as `<UserName>'s Kanban Board`.

## Language Standard

- Implementation language: JavaScript (ES2022)
- UI components: JSX (`.jsx`)
- Non-UI modules: `.js`
- Do not use TypeScript in this project unless explicitly requested later.

## Tech Stack (Feb 2026 Baseline)

- React `18.x` with concurrent rendering support
- State Management: `@reduxjs/toolkit ^2.x` + `react-redux`
- Row Rendering / Table Engine: `@tanstack/react-table ^8.x`
- Drag and Drop (preferred): `dnd-kit ^6.x` + `@dnd-kit/sortable`
- Drag and Drop (alternative): `@hello-pangea/dnd ^1.x`
- UI Components: `shadcn/ui` + `@radix-ui/react-*`
- Utilities: `date-fns`, `class-variance-authority`, `uuid`, `axios`

### DnD Library Choice Rationale

`dnd-kit` is the default due to stronger support for multi-container and nested interactions needed for hierarchical task movement and modal-based child reordering. `@hello-pangea/dnd` remains a viable fallback for simpler list interactions.

## Project Structure (src/)

```text
src/
  app/
    store.js
    hooks.js
  features/
    tasks/
      tasksSlice.js
      tasksSelectors.js
      tasksTypes.js
      tasksThunks.js
      tasksUtils.js
  components/
    board/
      KanbanBoard.jsx
      StatusSection.jsx
      HierarchyTable.jsx
      TaskRow.jsx
      RowExpander.jsx
      DragHandle.jsx
    task-modal/
      TaskDetailModal.jsx
      PercentageEditor.jsx
      ReparentSelector.jsx
      ChildPriorityList.jsx
  dnd/
    dndContext.jsx
    dragTypes.js
    dragReducers.js
    dragUtils.js
  services/
    apiClient.js
    tasksApi.js
  constants/
    statusBuckets.js
    errorCodes.js
  utils/
    hierarchy.js
    percentage.js
    validation.js
  assets/
    style.css
```

## Domain Model (Redux Normalized Shape)

```js
// Canonical client entity shape stored in Redux.
const task = {
  id: "task_123",
  name: "Design API contract",
  department: "Engineering",
  assignedTo: ["user_1", "user_2"],
  assignedBy: ["manager_9"],
  percentage: 65, // Leaf: editable. Parent: derived from direct children.
  ticketStatus: "Open",
  parentId: null,
  childrenIds: ["task_124", "task_125"], // Ordered by priority.
  statusBucket: "In Progress" // Derived from percentage.
};

const tasksState = {
  entities: {},
  ids: [],
  expandedRowIds: {},
  loading: false,
  error: null
};
```

## Derived Rules

### Status Bucket Mapping

- `0` => `Not Started`
- `1-50` => `On Hold`
- `51-99` => `In Progress`
- `100` => `Completed`

### Percentage Rules

- Leaf task percentage is user-editable (0-100).
- Parent task percentage is read-only in UI.
- Parent percentage is the arithmetic average of direct children percentages.
- Parent recalculation is triggered whenever:
  - a direct child percentage changes,
  - children are reordered/added/removed,
  - a task is reparented.

### Completion Rules

- A parent task can show `Completed` only when all descendants are `100`.
- If direct average equals `100` but any deeper descendant is not `100`, force parent bucket to non-completed (business guard).

## State Management Design

### tasksSlice Responsibilities

- Normalize and store tasks.
- Manage CRUD and hierarchy mutations.
- Maintain sibling order through `childrenIds`.
- Store expansion state (`expandedRowIds`).
- Handle async state for API thunks (`loading`, `error`).

### Selectors

- `getTasksByStatus(state, bucket)`:
  - returns root tasks in the bucket plus expanded descendants for rendering pipeline.
- `getDescendants(state, taskId)`:
  - returns descendant IDs for cycle prevention and modal exclusions.
- `calculatePercentage(state, taskId)`:
  - computes leaf/parent percentage with memoization.

### Thunk Boundaries

- UI dispatches domain actions first for optimistic behavior where safe.
- Thunks synchronize server state and reconcile conflicts.
- Critical hierarchy updates (reparent/reorder) should use transactional API endpoints.

## Row/Table Rendering Architecture

- One board viewport contains four status sections.
- Each section has a sticky header and collapsible content.
- Each section renders:
  - root tasks in that status bucket,
  - expanded descendants as indented rows in hierarchical order.

### Expansion Strategy

- Preferred: manual row flattening from normalized state for deterministic ordering.
- Alternative: TanStack `getSubRows` if data transformation cost remains acceptable.

### Virtualization Strategy

- Enable virtualization when total rendered row count exceeds `~500`.
- Use TanStack Virtual (or `react-window`) with fixed or measured row heights.
- Preserve keyboard navigation and drag affordances under virtualization.

## Drag and Drop Architecture

### Drag Handles and Sensors

- Dedicated drag handle on each row (`grip` icon).
- Support pointer and touch sensors; tune activation constraints for accidental drag prevention.

### Reorder Within Same Parent/Status

- Updates only sibling order in `childrenIds`.
- Does not mutate percentage or bucket.
- Treated as priority change only.

### Cross-Status Move

- Leaf task drop into a different status section sets percentage to nearest valid bucket boundary:
  - `Not Started` => `0`
  - `On Hold` => `1` (default boundary value)
  - `In Progress` => `51` (default boundary value)
  - `Completed` => `100`
- Then recompute all impacted ancestors.
- Parent tasks cannot be directly percentage-edited through drag between buckets.

### Nested / Hierarchical Moves

- Primary nesting actions occur in modal to reduce accidental tree corruption.
- Optional direct board nesting can be added later with stricter hover constraints and previews.

## Modal Behavior Contract

`TaskDetailModal` is the authoritative surface for structural edits.

- Edit leaf percentage:
  - allowed only for leaf tasks,
  - validates `0-100`,
  - triggers ancestor recalculation.
- Reparent task (`Nest under...`):
  - candidate list excludes task itself and all descendants.
- Move child to another parent:
  - preserves child subtree,
  - updates old/new parent `childrenIds`.
- Child priority reorder:
  - drag list inside modal updates parent `childrenIds` order.

## Performance and UX Constraints

- Selector memoization required for large trees.
- Re-render isolation: row components subscribe by ID where possible.
- Keep drag overlays lightweight.
- Avoid full-board recomputation by recalculating only affected ancestor chains.
- Use debounced search/filtering to reduce churn.

## Validation Rules and Edge Cases

- Reject cycle creation (self-parenting, descendant-parenting).
- Reject invalid percentages (<0 or >100).
- Guard against orphan references (missing child ID in entities).
- If parent has zero children, treat it as leaf for percentage editability.
- Collapse behavior must preserve expanded state across filter changes.
- Cross-status drop on parent rows should either:
  - be blocked, or
  - open modal confirmation flow.

## Public Interfaces and Contracts

### Frontend Task Entity

Use normalized task object shape as canonical client model. Map backend `_id` to `id` at API boundary.

### API DTO Expectations

- `taskDto` includes hierarchy and percentage fields.
- Mutations:
  - reorder siblings,
  - reparent node,
  - update leaf percentage.
- Error shape:

```js
const apiError = {
  statusCode: 400,
  code: "INVALID_PARENT",
  message: "Parent task does not exist"
};
```

## Testing Strategy

- Selector tests:
  - bucket derivation,
  - descendant traversal,
  - parent percentage calculations.
- Reducer tests:
  - reorder correctness,
  - reparent consistency,
  - expansion state behavior.
- DnD interaction tests:
  - same-parent reorder,
  - cross-status leaf move.
- Modal tests:
  - descendant exclusion in parent picker,
  - leaf-only percentage edit,
  - child move and reorder.
- Integration tests:
  - ancestor recomputation after complex move.

## Required Test Scenarios

1. Leaf moved `In Progress -> Completed` updates percentage to valid completed value and recomputes ancestors.
2. Reordering children under same parent changes priority only.
3. Nesting a node under its descendant is rejected.
4. Parent with mixed direct-child percentages uses direct-average rule.
5. Parent remains non-completed if any descendant is incomplete.
6. Selectors remain stable and performant for large datasets.

## Open Points / Future Enhancements

- Auth and user directory integration.
- Real-time updates (`socket.io` or SSE).
- Advanced filters (department, assignee, text search).
- Offline support and conflict resolution.
- Enhanced mobile drag tuning and haptics.

## Context Window Usage

- Date: `2026-02-15`
- Context Window Used: `60%`

## Workflow Performed

1. Built React JSX Kanban foundation with Redux normalized task state.
2. Implemented hierarchy rendering, expansion, and multi-status board behavior.
3. Added DnD flow for same-parent reorder and cross-status leaf movement.
4. Added create/edit/delete/add-children task flows with modal and FAB UX.
5. Added assignee/timeline/manual comment handling inside modal workflows.
6. Added dedicated timeline modal with chronological logs and export/copy options.
7. Refined responsive UI, centered action controls, and compact percentage controls.
