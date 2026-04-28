import { defineCommand } from "@bunli/core";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CarolinaTab, WsoOwlCmsParsedBlock, WsoOwlCmsReferenceMeta } from "../types/wsoOWLCMS";

const CAROLINA_SHEET_ID = "1rKFzpkLCT-FE2SzM0qpUOoZ788YHl7dg";
const REFERENCE_SPREADSHEET_ID = "1ZI9TOZ8Ql-ACxNIcytsPXrWfetZFXyjg";
const REFERENCE_GID = "1911965444";

const CAROLINA_TABS = {
  youth: "1785893123",
  junior: "1157313505",
  senior: "2109027801",
  masters: "448005775",
} as const;

const OUTPUT_FIELDS = [
  "federation",
  "recordName",
  "ageGroup",
  "gender",
  "ageMin",
  "ageMax",
  "bodyWeightMin",
  "bodyWeightMax",
  "lift",
  "record",
  "name",
  "date",
  "place",
];

const LIFT_ALIASES: Record<string, string> = {
  snatch: "Snatch",
  "c & j": "Clean & Jerk",
  "c&j": "Clean & Jerk",
  "clean & jerk": "Clean & Jerk",
  total: "Total",
};

function referenceKey(ageGroup: string, gender: string, classLabel: string): string {
  return `${ageGroup}\u0000${gender}\u0000${classLabel}`;
}

async function httpGetText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} ${response.statusText}: ${url}`);
  }

  return await response.text();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}

function htmlTableToRows(html: string): string[][] {
  const rows: string[][] = [];
  const rowMatches = html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const rowMatch of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi);

    for (const cellMatch of cellMatches) {
      const withoutTags = cellMatch[1].replace(/<[^>]*>/g, "");
      cells.push(decodeHtml(withoutTags).trim());
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) {
    throw new Error("No HTML table found in page");
  }

  return rows;
}

function stripRowIndexColumn(rows: string[][]): string[][] {
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
      const trimmed = row.map((cell) => cell.trim());
      return /^\d+$/.test(trimmed[0] ?? "") ? trimmed.slice(1) : trimmed;
    });
}

async function fetchCarolinaRows(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${CAROLINA_SHEET_ID}/htmlview/sheet?headers=true&gid=${gid}`;
  const html = await httpGetText(url);
  return stripRowIndexColumn(htmlTableToRows(html));
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) {
    return [];
  }

  return dataRows.map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""])));
}

function classLabelFromReferenceBounds(bodyWeightMax: string): string {
  const bmax = bodyWeightMax.trim();
  if (bmax.startsWith(">")) {
    const number = bmax.replace(/\D/g, "");
    return number ? `${number}+` : bmax;
  }

  const parsed = Number.parseFloat(bmax);
  return Number.isNaN(parsed) ? bmax : String(Math.trunc(parsed));
}

async function fetchReferenceMap(): Promise<Map<string, WsoOwlCmsReferenceMeta>> {
  const url = `https://docs.google.com/spreadsheets/d/${REFERENCE_SPREADSHEET_ID}/export?format=csv&gid=${REFERENCE_GID}`;
  const text = await httpGetText(url);
  const map = new Map<string, WsoOwlCmsReferenceMeta>();

  for (const row of parseCsv(text)) {
    const ageGroup = row.ageGroup?.trim() ?? "";
    const gender = row.gender?.trim() ?? "";
    const bodyWeightMin = row.bodyWeightMin?.trim() ?? "";
    const bodyWeightMax = row.bodyWeightMax?.trim() ?? "";

    if (!ageGroup || !gender) {
      continue;
    }

    const key = referenceKey(ageGroup, gender, classLabelFromReferenceBounds(bodyWeightMax));
    if (!map.has(key)) {
      map.set(key, {
        ageMin: row.ageMin?.trim() ?? "",
        ageMax: row.ageMax?.trim() ?? "",
        bodyWeightMin,
        bodyWeightMax,
      });
    }
  }

  return map;
}

function normalizeCarolinaClassLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.endsWith("+")) {
    return trimmed;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? trimmed : String(Math.trunc(parsed));
}

function normalizeLift(value: string): string | null {
  return LIFT_ALIASES[value.trim().toLowerCase()] ?? null;
}

function parseDateToIso(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);

  if (!match) {
    return trimmed;
  }

  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  const rawYear = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + rawYear : rawYear;

  return `${year}-${month}-${day}`;
}

function normalizePersonName(value: string): string {
  return /^WSO\s+standard$/i.test(value.trim()) ? "STANDARD" : value.trim();
}

function padRow(row: string[], minLength = 20): string[] {
  return row.length >= minLength ? row : [...row, ...Array<string>(minLength - row.length).fill("")];
}

function isCategoryFirstCell(value: string): boolean {
  const cell = value.trim();
  if (!cell) {
    return false;
  }

  const lowered = cell.toLowerCase();
  if (["snatch", "c & j", "c&j", "total"].includes(lowered)) {
    return false;
  }

  return cell.endsWith("+") || /^\d/.test(cell);
}

function isContinuationFirstCell(value: string): boolean {
  return ["snatch", "c & j", "c&j", "total"].includes(value.trim().toLowerCase());
}

function splitHtmlRowPair(row: string[]): [string[] | null, string[] | null] {
  const padded = padRow(row);
  const firstCell = padded[0]?.trim() ?? "";

  if (isCategoryFirstCell(firstCell)) {
    return [padded.slice(0, 7), padded.slice(7, 14)];
  }

  if (isContinuationFirstCell(firstCell)) {
    return [
      ["", padded[0], padded[1], padded[2], padded[3], padded[4], padded[5]],
      ["", padded[6], padded[7], padded[8], padded[9], padded[10], padded[11]],
    ];
  }

  return [null, null];
}

function detectYouthAgeGroup(rowText: string): string | null {
  if (/13\s*&\s*under/i.test(rowText)) {
    return "U13";
  }
  if (/14\s*[-\u2013]\s*15/.test(rowText)) {
    return "U15";
  }
  if (/16\s*[-\u2013]\s*17/.test(rowText)) {
    return "U17";
  }
  return null;
}

function detectMastersSection(rowText: string): [number, number] | null {
  const match = rowText.match(/(\d{2})\s*[-\u2013]\s*(\d{2})\s*records?/i);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

function tabBaseAgeGroup(tab: CarolinaTab): string | null {
  if (tab === "junior") {
    return "JR";
  }
  if (tab === "senior") {
    return "Open";
  }
  return null;
}

function resolveAgeGroups(
  tab: CarolinaTab,
  base: string | null,
  youthSection: string | null,
  mastersBand: [number, number] | null,
): [string | null, string | null] {
  if (tab === "youth") {
    const youth = youthSection ?? "U13";
    return [youth, youth];
  }

  if (tab === "masters") {
    if (!mastersBand) {
      return [null, null];
    }
    return [`M${mastersBand[0]}`, `W${mastersBand[0]}`];
  }

  return base ? [base, base] : ["Open", "Open"];
}

function parseTripleBlockSide(
  rows: string[][],
  startIndex: number,
  ageGroup: string,
  lastWeight: string | null,
  menSide: boolean,
): Omit<WsoOwlCmsParsedBlock, "genderCode"> | null {
  if (startIndex + 2 >= rows.length) {
    return null;
  }

  const side7 = (index: number): string[] => {
    const [men, women] = splitHtmlRowPair(rows[index] ?? []);
    if (!men || !women) {
      return ["", "", "", "", "", "", ""];
    }
    return menSide ? men : women;
  };

  const r0 = side7(startIndex);
  const r1 = side7(startIndex + 1);
  const r2 = side7(startIndex + 2);
  let weightClass = r0[0]?.trim() ?? "";

  if (!weightClass && lastWeight) {
    weightClass = `${lastWeight}+`;
  }

  if (!weightClass) {
    return null;
  }

  const lifts = [
    ["Snatch", r0],
    ["C & J", r1],
    ["Total", r2],
  ].map(([labelRow, row]) => {
    const cells = row as string[];
    const lift = normalizeLift(cells[1] ?? "") ?? normalizeLift(labelRow as string) ?? (labelRow as string);
    const parsedRecord = Number.parseFloat((cells[2] ?? "").trim());

    return {
      lift,
      record: Number.isNaN(parsedRecord) ? null : Math.trunc(parsedRecord),
      name: normalizePersonName(cells[3] ?? ""),
      date: parseDateToIso(cells[5] ?? ""),
      place: (cells[6] ?? "").trim(),
    };
  });

  return {
    weightClass,
    ageGroup,
    lifts,
  };
}

function iterSideBySideRecords(rows: string[][], tab: CarolinaTab): WsoOwlCmsParsedBlock[] {
  const blocks: WsoOwlCmsParsedBlock[] = [];
  const base = tabBaseAgeGroup(tab);
  let youthSection: string | null = null;
  let mastersBand: [number, number] | null = null;
  let lastMenWeight: string | null = null;
  let lastWomenWeight: string | null = null;

  for (let i = 0; i < rows.length; i += 1) {
    const row = padRow(rows[i]);
    if (!row.some((cell) => cell.trim())) {
      continue;
    }

    const joined = row.join(" ");
    if (tab === "youth") {
      const detected = detectYouthAgeGroup(joined);
      if (detected) {
        youthSection = detected;
        lastMenWeight = null;
        lastWomenWeight = null;
      }
    }

    if (tab === "masters") {
      const detected = detectMastersSection(joined);
      if (detected) {
        mastersBand = detected;
        lastMenWeight = null;
        lastWomenWeight = null;
      }
    }

    const [men, women] = splitHtmlRowPair(row);
    if (!men || !women) {
      continue;
    }

    const menIsSnatch = men[1] === "Snatch" || normalizeLift(men[1] ?? "") === "Snatch";
    const womenIsSnatch = women[1] === "Snatch" || normalizeLift(women[1] ?? "") === "Snatch";
    if (!menIsSnatch && !womenIsSnatch) {
      continue;
    }

    const [menAgeGroup, womenAgeGroup] = resolveAgeGroups(tab, base, youthSection, mastersBand);
    if (!menAgeGroup || !womenAgeGroup) {
      continue;
    }

    const menRecord = parseTripleBlockSide(rows, i, menAgeGroup, lastMenWeight, true);
    if (menRecord) {
      blocks.push({ ...menRecord, genderCode: "M" });
      if (menRecord.weightClass && !menRecord.weightClass.endsWith("+")) {
        lastMenWeight = menRecord.weightClass;
      }
    }

    const womenRecord = parseTripleBlockSide(rows, i, womenAgeGroup, lastWomenWeight, false);
    if (womenRecord) {
      blocks.push({ ...womenRecord, genderCode: "F" });
      if (womenRecord.weightClass && !womenRecord.weightClass.endsWith("+")) {
        lastWomenWeight = womenRecord.weightClass;
      }
    }
  }

  return blocks;
}

function emitCsvRows(referenceMap: Map<string, WsoOwlCmsReferenceMeta>, parsed: WsoOwlCmsParsedBlock[]): string[][] {
  const outputRows: string[][] = [];

  for (const block of parsed) {
    const classLabel = normalizeCarolinaClassLabel(block.weightClass);
    const meta = referenceMap.get(referenceKey(block.ageGroup, block.genderCode, classLabel));

    if (!meta) {
      continue;
    }

    for (const lift of block.lifts) {
      if (lift.record == null) {
        continue;
      }

      outputRows.push([
        "Carolina",
        "Carolina",
        block.ageGroup,
        block.genderCode,
        meta.ageMin,
        meta.ageMax,
        meta.bodyWeightMin,
        meta.bodyWeightMax,
        lift.lift,
        String(lift.record),
        lift.name,
        lift.date,
        lift.place,
      ]);
    }
  }

  return outputRows;
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

async function buildCarolinaOwlCmsRows(): Promise<string[][]> {
  const referenceMap = await fetchReferenceMap();
  const outputRows: string[][] = [];

  for (const [tab, gid] of Object.entries(CAROLINA_TABS) as Array<[CarolinaTab, string]>) {
    const grid = await fetchCarolinaRows(gid);
    const blocks = iterSideBySideRecords(grid, tab);
    outputRows.push(...emitCsvRows(referenceMap, blocks));
  }

  return outputRows;
}

export default defineCommand({
  name: "wsoOWLCMS" as const,
  description: "Export Carolina WSO records as an OWLCMS CSV",
  options: {},
  handler: async ({ positional }) => {
    if (positional.length > 0) {
      throw new Error("Usage: meetcal wsoOWLCMS");
    }

    const rows = await buildCarolinaOwlCmsRows();
    const downloadsDir = join(homedir(), "Downloads");
    const outputPath = join(downloadsDir, "wsoOWLCMS.csv");

    await mkdir(downloadsDir, { recursive: true });
    await writeFile(outputPath, toCsv([OUTPUT_FIELDS, ...rows]), "utf8");

    console.log(`Wrote ${rows.length} Carolina rows to ${outputPath}`);
  },
});
