export const STATUS_BUCKETS = ["Not Started", "On Hold", "In Progress", "Completed"];

export function bucketFromPercentage(percentage) {
  const value = Number(percentage);
  if (value === 0) return "Not Started";
  if (value >= 1 && value <= 50) return "On Hold";
  if (value >= 51 && value <= 99) return "In Progress";
  return "Completed";
}

export function defaultPercentageForBucket(bucket) {
  if (bucket === "Not Started") return 0;
  if (bucket === "On Hold") return 1;
  if (bucket === "In Progress") return 51;
  return 100;
}

