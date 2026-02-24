import { bucketFromPercentage } from "../../constants/statusBuckets";

export function normalizeTasks(tasks) {
  const entities = {};
  const ids = [];
  for (const task of tasks) {
    const percentage = Number(task.percentage || 0);
    entities[task.id] = {
      ...task,
      childrenIds: task.childrenIds || [],
      percentage,
      statusBucket: task.statusBucket || bucketFromPercentage(percentage),
      ticketStatus: percentage >= 100 ? "Closed" : "Open"
    };
    ids.push(task.id);
  }
  return { entities, ids };
}
