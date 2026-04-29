export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function numberValue(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

export function maxPositive(values: Array<number | null | undefined>): number {
  const successful = positiveValues(values);
  return successful.length > 0 ? Math.max(...successful) : 0;
}

export function positiveValues(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && value > 0);
}

export function formatValue(value: string | number | boolean | undefined): string {
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function maxNullable(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (numbers.length === 0) {
    return null;
  }

  return Math.max(...numbers);
}


