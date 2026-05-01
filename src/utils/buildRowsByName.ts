import LiftingResults from "../types/liftingResults";

//create new map where name is string, then results
//map over this and check if name is duplicated
// outputs key:value pair of name to meet result
export function buildRowsByName(rows: LiftingResults[]): Map<string, LiftingResults[]> {
  const rowsByName = new Map<string, LiftingResults[]>();

  for (const row of rows) {
    const existing = rowsByName.get(row.name) ?? [];
    existing.push(row);
    rowsByName.set(row.name, existing);
  }

  return rowsByName;
}
