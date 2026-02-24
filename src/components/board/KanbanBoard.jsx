import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { STATUS_BUCKETS } from "../../constants/statusBuckets";
import {
  addTaskTreeLocal,
  addChildrenToTaskLocal,
  deleteTaskTreeLocal,
  moveLeafToBucketLocal,
  reparentTaskLocal,
  reorderChildLocal,
  reorderRootLocal,
  restoreTasksSnapshot,
  setLeafPercentageLocal,
  setQuery,
  toggleExpand,
} from "../../features/tasks/tasksSlice";
import {
  addChildrenToTask,
  createTaskTree,
  deleteTaskTree,
  fetchTasks,
  moveLeafToBucket,
  moveTask,
  patchTask,
  reorderTask,
} from "../../features/tasks/tasksThunks";
import {
  selectAllTasks,
  selectEntities,
  selectExpanded,
  selectRowsByStatus,
  selectTasksState,
} from "../../features/tasks/tasksSelectors";
import StatusSection from "./StatusSection";
import TaskDetailModal from "../task-modal/TaskDetailModal";
import AddChildrenModal from "../task-modal/AddChildrenModal";
import TaskTimelineModal from "../task-modal/TaskTimelineModal";
import CreateTaskModal from "../task-modal/CreateTaskModal";
import Notifications from "../common/Notifications";
import {
  listCompaniesApi,
  listDepartmentsApi,
  searchAssigneesApi,
} from "../../services/authApi";

function parseDndId(id) {
  const [kind, value] = String(id).split(":");
  return { kind, value };
}

function ticketStatusFromPercentage(percentage) {
  return Number(percentage) >= 100 ? "Closed" : "Open";
}

const ROLE_RANK = {
  god: 5,
  leader: 4,
  coleader: 3,
  elder: 2,
  member: 1,
};

function roleRank(role) {
  return ROLE_RANK[String(role || "").trim()] || 0;
}

export default function KanbanBoard({ userName = "", currentUser = null }) {
  const dispatch = useAppDispatch();
  const entities = useAppSelector(selectEntities);
  const rowsByStatus = useAppSelector(selectRowsByStatus);
  const expanded = useAppSelector(selectExpanded);
  const allTasks = useAppSelector(selectAllTasks);
  const tasksState = useAppSelector(selectTasksState);

  const [activeId, setActiveId] = useState(null);
  const [modalTaskId, setModalTaskId] = useState(null);
  const [timelineTaskId, setTimelineTaskId] = useState(null);
  const [addChildrenTaskId, setAddChildrenTaskId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCompany, setNewTaskCompany] = useState("");
  const [newTaskDepartment, setNewTaskDepartment] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskAssignedToUserId, setNewTaskAssignedToUserId] = useState("");
  const [newTaskAssignedBy, setNewTaskAssignedBy] = useState("");
  const [newTaskPercentage, setNewTaskPercentage] = useState("0");
  const [newTaskInitialDate, setNewTaskInitialDate] = useState("");
  const [newTaskFinalDate, setNewTaskFinalDate] = useState("");
  const [newTaskFinalPercentage, setNewTaskFinalPercentage] = useState("");
  const [newTaskChildren, setNewTaskChildren] = useState("");
  const [companyOptions, setCompanyOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeSearchBusy, setAssigneeSearchBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks()).catch(() => {});
  }, [dispatch]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));
  const activeTask = activeId ? entities[activeId] : null;
  const modalTask = modalTaskId ? entities[modalTaskId] : null;
  const timelineTask = timelineTaskId ? entities[timelineTaskId] : null;
  const addChildrenTask = addChildrenTaskId
    ? entities[addChildrenTaskId]
    : null;

  const headerMeta = useMemo(() => {
    const all = Object.values(entities);
    const parentCount = all.filter((task) => !task.parentId).length;
    const childCount = all.filter((task) => Boolean(task.parentId)).length;
    const parentLabel = parentCount === 1 ? "parent task" : "parent tasks";
    const childLabel = childCount === 1 ? "child task" : "child tasks";
    return `${parentCount} ${parentLabel} • ${childCount} ${childLabel}`;
  }, [entities]);
  const boardTitle = useMemo(() => {
    const name = String(userName || "").trim();
    return name ? `${name}'s Kanban Board` : "Kanban Board";
  }, [userName]);
  const canCreateTask = useMemo(() => {
    const role = String(currentUser?.userRole || "").trim();
    return ["god", "leader", "coleader", "elder"].includes(role);
  }, [currentUser?.userRole]);

  const canDeleteTask = useMemo(() => {
    return (task) => {
      const actorRole = String(currentUser?.userRole || "").trim();
      const actorId = String(currentUser?.id || "").trim();
      if (!["god", "leader", "coleader", "elder"].includes(actorRole)) return false;
      if (actorRole === "god") return true;
      const assignerId = String(task?.assignedByUserId || "").trim();
      const assignerRole = String(task?.assignedByRole || "").trim();
      if (!assignerId || !assignerRole) return false;
      if (actorId && actorId === assignerId) return true;
      return roleRank(actorRole) > roleRank(assignerRole);
    };
  }, [currentUser?.id, currentUser?.userRole]);

  useEffect(() => {
    if (!showCreateModal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setShowCreateModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showCreateModal]);

  useEffect(() => {
    if (!showCreateModal) return;
    setNewTaskAssignedBy(String(currentUser?.name || ""));
    listCompaniesApi("")
      .then((companies) => setCompanyOptions(Array.isArray(companies) ? companies : []))
      .catch(() => setCompanyOptions([]));
  }, [showCreateModal, currentUser?.name]);

  useEffect(() => {
    if (!showCreateModal) return;
    if (!newTaskCompany.trim()) {
      setDepartmentOptions([]);
      return;
    }
    listDepartmentsApi(newTaskCompany.trim(), "")
      .then((departments) =>
        setDepartmentOptions(Array.isArray(departments) ? departments : [])
      )
      .catch(() => setDepartmentOptions([]));
  }, [showCreateModal, newTaskCompany]);

  useEffect(() => {
    if (!showCreateModal) return undefined;
    const company = newTaskCompany.trim();
    const department = newTaskDepartment.trim();
    const query = newTaskAssignedTo.trim();
    if (!company || !department || !query) {
      setAssigneeOptions([]);
      setAssigneeSearchBusy(false);
      return undefined;
    }
    setAssigneeSearchBusy(true);
    const timer = setTimeout(() => {
      searchAssigneesApi({ company, department, query })
        .then((items) => setAssigneeOptions(Array.isArray(items) ? items : []))
        .catch(() => setAssigneeOptions([]))
        .finally(() => setAssigneeSearchBusy(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [showCreateModal, newTaskCompany, newTaskDepartment, newTaskAssignedTo]);

  function pushNotification(notification) {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const next = { id, ...notification };
    setNotifications((prev) => [...prev, next]);
    if (!notification.actions?.length) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
      }, 2800);
    }
    return id;
  }

  function closeNotification(id) {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }

  function handleDragStart(event) {
    const parsed = parseDndId(event.active.id);
    if (parsed.kind === "task") setActiveId(parsed.value);
  }

  function handleDragEnd(event) {
    const active = event.active?.id;
    const over = event.over?.id;
    setActiveId(null);
    if (!active || !over) return;

    const activeParsed = parseDndId(active);
    const overParsed = parseDndId(over);
    if (activeParsed.kind !== "task") return;

    const task = entities[activeParsed.value];
    if (!task) return;

    if (overParsed.kind === "row") {
      const overTask = entities[overParsed.value];
      if (!overTask) return;

      // Row drop is always reorder intent; never mutate bucket/percentage here.
      if (task.parentId !== overTask.parentId) return;
      if (task.parentId) {
        const siblings = entities[task.parentId]?.childrenIds || [];
        const fromIndex = siblings.indexOf(task.id);
        const toIndex = siblings.indexOf(overTask.id);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
        const snapshot = {
          entities: JSON.parse(JSON.stringify(entities)),
          ids: [...tasksState.ids],
        };
        dispatch(
          reorderChildLocal({ parentId: task.parentId, fromIndex, toIndex })
        );
        dispatch(reorderTask({ id: task.id, toIndex }))
          .unwrap()
          .catch(() => {
            dispatch(restoreTasksSnapshot(snapshot));
            dispatch(fetchTasks()).catch(() => {});
          });
        return;
      }

      if (task.statusBucket !== overTask.statusBucket) return;
      const rootIdsInBucket = Object.values(entities)
        .filter((item) => !item.parentId && item.statusBucket === task.statusBucket)
        .map((item) => item.id);
      const fromIndex = rootIdsInBucket.indexOf(task.id);
      const toIndex = rootIdsInBucket.indexOf(overTask.id);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      dispatch(reorderRootLocal({ bucket: task.statusBucket, fromIndex, toIndex }));
      return;
    }

    if (overParsed.kind === "bucket") {
      if ((task.childrenIds || []).length > 0) return;
      const bucket = overParsed.value;
      const snapshot = {
        entities: JSON.parse(JSON.stringify(entities)),
        ids: [...tasksState.ids],
      };
      dispatch(moveLeafToBucketLocal({ id: task.id, bucket }));
      dispatch(moveLeafToBucket({ id: task.id, bucket }))
        .unwrap()
        .catch(() => {
          dispatch(restoreTasksSnapshot(snapshot));
          dispatch(fetchTasks()).catch(() => {});
        });
      return;
    }
  }

  function handleCreateTask() {
    if (!canCreateTask) {
      pushNotification({
        title: "Forbidden",
        message: "Members cannot create tasks.",
      });
      return;
    }
    const name = newTaskName.trim();
    if (!name) {
      pushNotification({
        title: "Missing Name",
        message: "Please enter a task name.",
      });
      return;
    }
    if (String(newTaskPercentage).trim() === "") {
      pushNotification({
        title: "Missing Initial Percentage",
        message: "Initial percentage is required for new tasks.",
      });
      return;
    }
    if (String(newTaskFinalPercentage).trim() === "") {
      pushNotification({
        title: "Missing Final Percentage",
        message: "Final percentage is required for new tasks.",
      });
      return;
    }
    const percentageNum = Number(newTaskPercentage);
    const finalPercentageNum = Number(newTaskFinalPercentage);
    if (
      !Number.isFinite(percentageNum) ||
      percentageNum < 0 ||
      percentageNum > 100
    ) {
      pushNotification({
        title: "Invalid Percentage",
        message: "Initial % must be between 0 and 100.",
      });
      return;
    }
    if (
      !Number.isFinite(finalPercentageNum) ||
      finalPercentageNum < 0 ||
      finalPercentageNum > 100
    ) {
      pushNotification({
        title: "Invalid Final Percentage",
        message: "Final % must be between 0 and 100.",
      });
      return;
    }
    if (!newTaskFinalDate) {
      pushNotification({
        title: "Missing Final Date",
        message: "Final date is required for new tasks.",
      });
      return;
    }
    if (
      newTaskInitialDate &&
      newTaskFinalDate &&
      new Date(newTaskFinalDate) < new Date(newTaskInitialDate)
    ) {
      pushNotification({
        title: "Invalid Date Range",
        message: "Final date must be on or after the initial date.",
      });
      return;
    }
    const children = newTaskChildren
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((childName) => ({
        name: childName,
        company: newTaskCompany.trim(),
        department: newTaskDepartment.trim(),
        initialDate: newTaskInitialDate || null,
        finalDate: newTaskFinalDate || null,
        assignedDate: newTaskInitialDate || null,
        dueDate: newTaskFinalDate || null,
        percentage: 0,
        finalPercentage: Math.round(finalPercentageNum),
        targetPercentage: Math.round(finalPercentageNum),
        ticketStatus: ticketStatusFromPercentage(0),
        assignedTo: newTaskAssignedTo
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        assignedToUserIds: newTaskAssignedToUserId ? [newTaskAssignedToUserId] : [],
        assignedBy: newTaskAssignedBy
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      }));

    const parentPayload = {
      name,
      company: newTaskCompany.trim(),
      department: newTaskDepartment.trim(),
      initialDate: newTaskInitialDate || null,
      finalDate: newTaskFinalDate || null,
      assignedDate: newTaskInitialDate || null,
      dueDate: newTaskFinalDate || null,
      percentage: Math.round(percentageNum),
      finalPercentage: Math.round(finalPercentageNum),
      targetPercentage: Math.round(finalPercentageNum),
      ticketStatus: ticketStatusFromPercentage(Math.round(percentageNum)),
      assignedTo: newTaskAssignedTo
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      assignedToUserIds: newTaskAssignedToUserId ? [newTaskAssignedToUserId] : [],
      assignedBy: newTaskAssignedBy
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };

    dispatch(createTaskTree({ parent: parentPayload, children }))
      .unwrap()
      .then(() => {
        pushNotification({
          title: "Task Added",
          message: `${name} created with ${Math.round(percentageNum)}%`,
        });
      })
      .catch(() => {
        dispatch(addTaskTreeLocal({ parent: parentPayload, children }));
        pushNotification({
          title: "Offline Add",
          message: `${name} created locally with ${Math.round(percentageNum)}%`,
        });
      });

    setNewTaskName("");
    setNewTaskCompany("");
    setNewTaskDepartment("");
    setNewTaskAssignedTo("");
    setNewTaskAssignedToUserId("");
    setNewTaskAssignedBy("");
    setNewTaskPercentage("0");
    setNewTaskInitialDate("");
    setNewTaskFinalDate("");
    setNewTaskFinalPercentage("");
    setNewTaskChildren("");
    setAssigneeOptions([]);
    setShowCreateModal(false);
  }

  function handleClearCreateTaskForm() {
    setNewTaskName("");
    setNewTaskCompany("");
    setNewTaskDepartment("");
    setNewTaskAssignedTo("");
    setNewTaskAssignedToUserId("");
    setNewTaskAssignedBy("");
    setNewTaskPercentage("0");
    setNewTaskInitialDate("");
    setNewTaskFinalDate("");
    setNewTaskFinalPercentage("");
    setNewTaskChildren("");
    setAssigneeOptions([]);
  }

  function handleDeleteTask(taskId) {
    const task = entities[taskId];
    if (!task) return;
    const snapshot = {
      entities: JSON.parse(JSON.stringify(entities)),
      ids: [...tasksState.ids],
    };
    dispatch(deleteTaskTreeLocal({ id: taskId }));
    dispatch(deleteTaskTree({ id: taskId }))
      .unwrap()
      .then(() =>
        pushNotification({ title: "Deleted", message: `${task.name} removed` })
      )
      .catch(() => {
        dispatch(restoreTasksSnapshot(snapshot));
        dispatch(fetchTasks()).catch(() => {});
        pushNotification({
          title: "Delete Failed",
          message: "Could not delete task. Local changes were reverted.",
        });
      });
    if (modalTaskId === taskId) setModalTaskId(null);
  }

  function handleAddChildren(taskId) {
    const task = entities[taskId];
    if (!task) return;
    setAddChildrenTaskId(taskId);
  }

  function submitAddChildren(childInput) {
    const task = addChildrenTaskId ? entities[addChildrenTaskId] : null;
    if (!task) return;
    const initialPct = Number(childInput?.percentage ?? 0);
    const children = [
      {
        name: String(childInput?.name || "").trim(),
        company: childInput?.company ?? task.company ?? "",
        department: childInput?.department ?? task.department ?? "",
        assignedTo: Array.isArray(childInput?.assignedTo)
          ? childInput.assignedTo
          : [],
        assignedToUserIds: Array.isArray(childInput?.assignedToUserIds)
          ? childInput.assignedToUserIds
          : [],
        assignedBy: Array.isArray(childInput?.assignedBy)
          ? childInput.assignedBy
          : [],
        initialDate: childInput?.initialDate ?? null,
        finalDate: childInput?.finalDate ?? null,
        assignedDate: childInput?.assignedDate ?? null,
        dueDate: childInput?.dueDate ?? null,
        percentage: Math.round(Number.isFinite(initialPct) ? initialPct : 0),
        finalPercentage: Number(childInput?.finalPercentage ?? 100),
        targetPercentage: Number(childInput?.targetPercentage ?? 100),
        ticketStatus: ticketStatusFromPercentage(initialPct),
      },
    ];

    dispatch(addChildrenToTask({ parentId: task.id, children }))
      .unwrap()
      .then(() => {
        pushNotification({
          title: "Child Added",
          message: "Child task added successfully.",
        });
      })
      .catch(() => {
        dispatch(addChildrenToTaskLocal({ parentId: task.id, children }));
        pushNotification({
          title: "Offline Add",
          message: "Child added locally. Sync later.",
        });
      });
    setAddChildrenTaskId(null);
  }

  return (
    <motion.div
      className="kanban-app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="board-shell"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <header className="board-header">
          <h1 className="board-title">{boardTitle}</h1>
          <div className="board-meta">{headerMeta}</div>
          <div className="toolbar">
            <input
              className="input"
              placeholder="Search task, assignee, department"
              value={tasksState.query}
              onChange={(e) => dispatch(setQuery(e.target.value))}
            />
          </div>
        </header>

        <div className="board-scroll">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="status-grid">
              {STATUS_BUCKETS.map((status) => (
                <StatusSection
                  key={status}
                  status={status}
                  rows={rowsByStatus[status] || []}
                  entities={entities}
                  expandedRowIds={expanded}
                  onToggleExpand={(id) => dispatch(toggleExpand(id))}
                  onOpenTask={(id) => setModalTaskId(id)}
                  onDeleteTask={handleDeleteTask}
                  onAddChildren={handleAddChildren}
                  canDeleteTask={canDeleteTask}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="row-card" style={{ width: 280 }}>
                  <div className="task-name">{activeTask.name}</div>
                  <div className="task-meta">{activeTask.department}</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </motion.div>

      <AnimatePresence>
      {modalTask ? (
        <motion.div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 16, 10, 0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 16,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <TaskDetailModal
              task={modalTask}
              currentUser={currentUser}
              allTasks={allTasks}
              entities={entities}
              onClose={() => setModalTaskId(null)}
              onViewLogs={() => setTimelineTaskId(modalTask.id)}
              onSavePercentage={(id, percentage) => {
                const snapshot = {
                  entities: JSON.parse(JSON.stringify(entities)),
                  ids: [...tasksState.ids],
                };
                dispatch(setLeafPercentageLocal({ id, percentage }));
                dispatch(
                  patchTask({ id, payload: { percentage: Number(percentage) } })
                )
                  .unwrap()
                  .catch(() => {
                    dispatch(restoreTasksSnapshot(snapshot));
                    dispatch(fetchTasks()).catch(() => {});
                    pushNotification({
                      title: "Save Failed",
                      message: "Could not sync percentage with backend.",
                    });
                  });
              }}
              onReparent={(id, newParentId) => {
                const snapshot = {
                  entities: JSON.parse(JSON.stringify(entities)),
                  ids: [...tasksState.ids],
                };
                dispatch(reparentTaskLocal({ id, newParentId }));
                dispatch(moveTask({ id, newParentId, insertAt: null }))
                  .unwrap()
                  .catch(() => {
                    dispatch(restoreTasksSnapshot(snapshot));
                    dispatch(fetchTasks()).catch(() => {});
                    pushNotification({
                      title: "Move Failed",
                      message: "Could not move task. Local changes were reverted.",
                    });
                  });
              }}
              onSavePeople={(id, assignedTo, assignedToUserIds) => {
                dispatch(
                  patchTask({
                    id,
                    payload: {
                      assignedTo,
                      assignedToUserIds,
                    },
                  })
                )
                  .unwrap()
                  .then(() =>
                    pushNotification({
                      title: "Saved",
                      message: "Assignee details updated",
                    })
                  )
                  .catch(() =>
                    pushNotification({
                      title: "Save Failed",
                      message: "Could not update assignee details",
                    })
                  );
              }}
              onSaveTimeline={(id, assignedDate, dueDate) => {
                dispatch(
                  patchTask({
                    id,
                    payload: {
                      assignedDate,
                      dueDate,
                    },
                  })
                )
                  .unwrap()
                  .then(() =>
                    pushNotification({
                      title: "Saved",
                      message: "Timeline updated",
                    })
                  )
                  .catch(() =>
                    pushNotification({
                      title: "Save Failed",
                      message: "Could not update timeline",
                    })
                  );
              }}
              onAddManualComment={(id, name, employeeId, message) => {
                const cleanMessage = String(message || "").trim();
                if (!cleanMessage) {
                  pushNotification({
                    title: "Missing Comment",
                    message: "Please enter a comment message.",
                  });
                  return;
                }
                dispatch(
                  patchTask({
                    id,
                    payload: {
                      addComment: {
                        type: "manual",
                        name: String(name || "").trim(),
                        employeeId: String(employeeId || "").trim(),
                        message: cleanMessage,
                      },
                    },
                  })
                )
                  .unwrap()
                  .then(() =>
                    pushNotification({
                      title: "Comment Added",
                      message: "Manual comment saved",
                    })
                  )
                  .catch(() =>
                    pushNotification({
                      title: "Save Failed",
                      message: "Could not save comment",
                    })
                  );
              }}
              onReorderChild={(parentId, fromIndex, toIndex) => {
                const snapshot = {
                  entities: JSON.parse(JSON.stringify(entities)),
                  ids: [...tasksState.ids],
                };
                dispatch(reorderChildLocal({ parentId, fromIndex, toIndex }));
                const childId = entities[parentId]?.childrenIds?.[toIndex];
                if (childId)
                  dispatch(reorderTask({ id: childId, toIndex }))
                    .unwrap()
                    .catch(() => {
                      dispatch(restoreTasksSnapshot(snapshot));
                      dispatch(fetchTasks()).catch(() => {});
                      pushNotification({
                        title: "Reorder Failed",
                        message: "Could not reorder child. Local changes were reverted.",
                      });
                    });
              }}
              onMoveChild={(childId, targetParentId) => {
                const snapshot = {
                  entities: JSON.parse(JSON.stringify(entities)),
                  ids: [...tasksState.ids],
                };
                dispatch(
                  reparentTaskLocal({ id: childId, newParentId: targetParentId })
                );
                dispatch(
                  moveTask({
                    id: childId,
                    newParentId: targetParentId,
                    insertAt: null,
                  })
                )
                  .unwrap()
                  .catch(() => {
                    dispatch(restoreTasksSnapshot(snapshot));
                    dispatch(fetchTasks()).catch(() => {});
                    pushNotification({
                      title: "Move Failed",
                      message: "Could not move child task. Local changes were reverted.",
                    });
                  });
              }}
            />
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
      {addChildrenTask ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 16, 10, 0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <AddChildrenModal
            task={addChildrenTask}
            onClose={() => setAddChildrenTaskId(null)}
            onSubmit={submitAddChildren}
          />
        </div>
      ) : null}
      {timelineTask ? (
        <div
          className="timeline-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 16, 10, 0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: 12,
          }}
        >
          <TaskTimelineModal
            task={timelineTask}
            onClose={() => setTimelineTaskId(null)}
            pushNotification={pushNotification}
          />
        </div>
      ) : null}
      <AnimatePresence>
      {showCreateModal && canCreateTask ? (
        <motion.div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 16, 10, 0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 55,
            padding: 16,
          }}
          onClick={() => setShowCreateModal(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <CreateTaskModal
              values={{
                name: newTaskName,
                company: newTaskCompany,
                department: newTaskDepartment,
                assignedTo: newTaskAssignedTo,
                assignedBy: newTaskAssignedBy,
                percentage: newTaskPercentage,
                initialDate: newTaskInitialDate,
                finalDate: newTaskFinalDate,
                finalPercentage: newTaskFinalPercentage,
                children: newTaskChildren,
              }}
              onChange={(key, value) => {
                if (key === "name") setNewTaskName(value);
                if (key === "company") {
                  setNewTaskCompany(value);
                  setNewTaskAssignedTo("");
                  setNewTaskAssignedToUserId("");
                  setAssigneeOptions([]);
                }
                if (key === "department") {
                  setNewTaskDepartment(value);
                  setNewTaskAssignedTo("");
                  setNewTaskAssignedToUserId("");
                  setAssigneeOptions([]);
                }
                if (key === "assignedTo") {
                  setNewTaskAssignedTo(value);
                  setNewTaskAssignedToUserId("");
                }
                if (key === "assignedBy") setNewTaskAssignedBy(value);
                if (key === "percentage") {
                  if (value === "") {
                    setNewTaskPercentage("");
                  } else {
                    const parsed = Number(value);
                    if (Number.isFinite(parsed)) {
                      setNewTaskPercentage(String(Math.min(100, Math.max(0, parsed))));
                    }
                  }
                }
                if (key === "initialDate") {
                  setNewTaskInitialDate(value);
                  if (newTaskFinalDate && value && new Date(newTaskFinalDate) < new Date(value)) {
                    setNewTaskFinalDate(value);
                  }
                }
                if (key === "finalDate") {
                  if (newTaskInitialDate && value && new Date(value) < new Date(newTaskInitialDate)) {
                    setNewTaskFinalDate(newTaskInitialDate);
                  } else {
                    setNewTaskFinalDate(value);
                  }
                }
                if (key === "finalPercentage") {
                  if (value === "") {
                    setNewTaskFinalPercentage("");
                  } else {
                    const parsed = Number(value);
                    if (Number.isFinite(parsed)) {
                      setNewTaskFinalPercentage(String(Math.min(100, Math.max(0, parsed))));
                    }
                  }
                }
                if (key === "children") setNewTaskChildren(value);
              }}
              onClose={() => setShowCreateModal(false)}
              onSelectAssignee={(option) => {
                setNewTaskAssignedTo(option.label);
                setNewTaskAssignedToUserId(option.id);
                setAssigneeOptions([]);
              }}
              assigneeOptions={assigneeOptions}
              assigneeLoading={assigneeSearchBusy}
              companyOptions={companyOptions}
              departmentOptions={departmentOptions}
              onCreate={handleCreateTask}
              onClear={handleClearCreateTaskForm}
            />
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
      {canCreateTask ? (
        <button
          type="button"
          className="fab-create-btn"
          aria-label={
            showCreateModal ? "Close create task modal" : "Open create task modal"
          }
          title={showCreateModal ? "Close" : "Create task"}
          onClick={() => setShowCreateModal((prev) => !prev)}
        >
          {showCreateModal ? "X" : "+"}
        </button>
      ) : null}
      <Notifications
        items={notifications}
        onClose={closeNotification}
        position="left"
      />
    </motion.div>
  );
}
