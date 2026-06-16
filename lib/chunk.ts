// Splits an array into fixed-size groups. Used to fan out Firestore
// "in" queries, which accept at most 30 values.
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) {
    throw new Error("Chunk size must be at least 1.");
  }
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}
