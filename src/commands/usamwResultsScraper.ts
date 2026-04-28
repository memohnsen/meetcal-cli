import { defineCommand, option } from "@bunli/core";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type LiftingResults from "../types/liftingResults";
import type { PdfTextItem, UsamwScraperArgs } from "../types/usamwResultsScraper";

function extractGoogleDriveFileId(url: string): string | null {
  return url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const fileId = extractGoogleDriveFileId(url);
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;
  let response = await fetch(downloadUrl);

  if (fileId) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const confirm = html.match(/confirm=([^&"']+)/)?.[1];
      if (confirm) {
        response = await fetch(`${downloadUrl}&confirm=${confirm}`);
      } else {
        throw new Error(`Google Drive did not return a PDF for ${url}`);
      }
    }
  }

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function isRedFill(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 3) {
    return false;
  }

  const [rRaw, gRaw, bRaw] = value as number[];
  const r = rRaw <= 1 ? rRaw * 255 : rRaw;
  const g = gRaw <= 1 ? gRaw * 255 : gRaw;
  const b = bRaw <= 1 ? bRaw * 255 : bRaw;

  return r > 200 && g < 100 && b < 100;
}

async function loadPdfJs() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    throw new Error("Missing dependency pdfjs-dist. Run `bun install` before using this command.");
  }
}

async function extractPdfTextItems(pdfBytes: Uint8Array): Promise<Map<number, PdfTextItem[]>> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: pdfBytes });
  const document = await loadingTask.promise;
  const pages = new Map<number, PdfTextItem[]>();

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const operatorList = await page.getOperatorList();
    const redByTextOrder: boolean[] = [];
    let currentIsRed = false;

    for (let i = 0; i < operatorList.fnArray.length; i += 1) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      if (
        fn === pdfjs.OPS.setFillRGBColor ||
        fn === pdfjs.OPS.setStrokeRGBColor ||
        fn === pdfjs.OPS.setFillColor ||
        fn === pdfjs.OPS.setStrokeColor
      ) {
        currentIsRed = isRedFill(args);
      }

      if (
        fn === pdfjs.OPS.showText ||
        fn === pdfjs.OPS.showSpacedText ||
        fn === pdfjs.OPS.nextLineShowText ||
        fn === pdfjs.OPS.nextLineSetSpacingShowText
      ) {
        redByTextOrder.push(currentIsRed);
      }
    }

    const textItems = (textContent.items as unknown[])
      .filter((item: unknown): item is { str: string; transform: number[] } => {
        return typeof item === "object" && item !== null && "str" in item && "transform" in item;
      });

    const items = textItems
      .map((item: { str: string; transform: number[] }, index: number) => ({
        text: item.str.trim(),
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        isRed: redByTextOrder[index] ?? false,
      }))
      .filter((item: PdfTextItem) => item.text.length > 0)
      .sort((left: PdfTextItem, right: PdfTextItem) => {
        const yDiff = right.y - left.y;
        return Math.abs(yDiff) > 2 ? yDiff : left.x - right.x;
      });

    pages.set(pageNumber, items);
  }

  return pages;
}

function toAgeCategory(ageCode: string, weightCategory: string): string | null {
  const match = ageCode.match(/^([MW])(\d+)$/);
  if (!match) {
    return null;
  }

  const gender = match[1] === "W" ? "Women's" : "Men's";
  const start = Math.floor(Number(match[2]) / 5) * 5;
  const end = start + 4;
  return `${gender} Masters (${start}-${end}) ${weightCategory}kg`;
}

function normalizeName(rawName: string): string | null {
  const cleanName = rawName.replace(/\s*\(ADT\d*\)|\[ADT\]\s*|\s*\(adaptive\)/gi, " ").trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  let firstNameIndex = parts.length - 1;
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] !== parts[i].toUpperCase()) {
      firstNameIndex = i;
      break;
    }
  }

  const lastName = parts.slice(0, firstNameIndex).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
  const firstName = parts.slice(firstNameIndex).join(" ");

  return `${firstName} ${lastName}`.trim();
}

function parseAttempt(value: string, isRed: boolean): number {
  const parsed = Math.trunc(Number.parseFloat(value));
  return isRed ? -parsed : parsed;
}

function bestPositive(values: number[]): number {
  const positive = values.filter((value) => value > 0);
  return positive.length > 0 ? Math.max(...positive) : 0;
}

function slugEventId(meet: string, date: string): string {
  const slug = meet
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug}-${date}`;
}

function parseResultsFromPages(
  pages: Map<number, PdfTextItem[]>,
  meet: string,
  date: string,
  adaptive: boolean,
): LiftingResults[] {
  const results: LiftingResults[] = [];
  const eventId = slugEventId(meet, date);

  for (const items of pages.values()) {
    let currentAgeCategory: string | null = null;

    for (let i = 0; i < items.length; i += 1) {
      const text = items[i].text;
      const remainingLine = items
        .filter((item) => Math.abs(item.y - items[i].y) < 2)
        .map((item) => item.text)
        .join(" ");

      const ageMatch = remainingLine.match(/Age Group ([MW]\d+)\s+Weight Category ([\d+]+\+?)/);
      if (ageMatch) {
        currentAgeCategory = toAgeCategory(ageMatch[1], ageMatch[2]);
      }

      if (!currentAgeCategory || !/^\d{1,4}$/.test(text) || i + 1 >= items.length) {
        continue;
      }

      const nameText = items[i + 1].text;
      if (!/^[A-Z]+/.test(nameText)) {
        continue;
      }

      const name = normalizeName(nameText);
      if (!name) {
        continue;
      }

      const values: Array<{ value: string; isRed: boolean }> = [];
      let j = i + 2;
      while (j < items.length && values.length < 12) {
        const valueText = items[j].text;

        if (valueText === "-") {
          values.push({ value: "0", isRed: false });
        } else if (/^\d+\.?\d*$/.test(valueText)) {
          values.push({ value: valueText, isRed: items[j].isRed });
        } else if (/\d+\.?\d*/.test(valueText)) {
          const numbers = valueText.match(/\d+\.?\d*/g) ?? [];
          for (const number of numbers) {
            if (number.includes(".") || number.length >= 2) {
              values.push({ value: number, isRed: items[j].isRed });
            }
          }
        }

        j += 1;

        if (j < items.length) {
          const nextText = items[j].text;
          if (/^\d{2,4}$/.test(nextText) && /^[A-Z]+\s+[A-Za-z]+/.test(items[j + 1]?.text ?? "")) {
            break;
          }
          if (nextText.includes("Age Group")) {
            break;
          }
        }
      }

      if (values.length < 9) {
        continue;
      }

      const snatch1 = parseAttempt(values[2].value, values[2].isRed);
      const snatch2 = parseAttempt(values[3].value, values[3].isRed);
      const snatch3 = parseAttempt(values[4].value, values[4].isRed);
      const cj1 = parseAttempt(values[5].value, values[5].isRed);
      const cj2 = parseAttempt(values[6].value, values[6].isRed);
      const cj3 = parseAttempt(values[7].value, values[7].isRed);

      results.push({
        adaptive,
        age: currentAgeCategory,
        bodyWeight: Number.parseFloat(values[0].value),
        cj1,
        cj2,
        cj3,
        cjBest: bestPositive([cj1, cj2, cj3]),
        date,
        eventId,
        federation: "USAMW",
        meet,
        name,
        snatch1,
        snatch2,
        snatch3,
        snatchBest: bestPositive([snatch1, snatch2, snatch3]),
        total: Math.trunc(Number.parseFloat(values[8].value)),
      });

      i = j - 1;
    }
  }

  return results;
}

function formatValue(value: string | number | boolean | undefined): string {
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function writeConvexResults(results: LiftingResults[]): string {
  const fields: Array<keyof LiftingResults> = [
    "adaptive",
    "age",
    "bodyWeight",
    "cj1",
    "cj2",
    "cj3",
    "cjBest",
    "date",
    "eventId",
    "federation",
    "legacyId",
    "meet",
    "name",
    "snatch1",
    "snatch2",
    "snatch3",
    "snatchBest",
    "total",
  ];

  const lines = [
    "export type LiftingResults = {",
    "  adaptive: boolean;",
    "  age?: string;",
    "  bodyWeight?: number;",
    "  cj1?: number;",
    "  cj2?: number;",
    "  cj3?: number;",
    "  cjBest?: number;",
    "  date: string;",
    "  eventId: string;",
    "  federation?: string;",
    "  legacyId?: number;",
    "  meet: string;",
    "  name: string;",
    "  snatch1?: number;",
    "  snatch2?: number;",
    "  snatch3?: number;",
    "  snatchBest?: number;",
    "  total?: number;",
    "};",
    "",
    "export const liftingResults: LiftingResults[] = [",
  ];

  for (const result of results) {
    lines.push("  {");
    for (const field of fields) {
      const value = result[field];
      if (value !== undefined) {
        lines.push(`    ${field}: ${formatValue(value)},`);
      }
    }
    lines.push("  },");
  }

  lines.push("];", "");
  return lines.join("\n");
}

function validateDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Use --date in YYYY-MM-DD format.");
  }
}

function looksLikeDate(value: string | undefined): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function looksLikeBoolean(value: string | undefined): boolean {
  return value === "true" || value === "false";
}

function looksLikeUrl(value: string | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function parseScraperArgs(
  flags: {
    meet?: string;
    date?: string;
    adaptive: boolean;
    pdf?: string[];
  },
  positional: string[],
): UsamwScraperArgs {
  const dateIndex = positional.findIndex(looksLikeDate);
  const inferredDate = dateIndex === -1 ? undefined : positional[dateIndex];
  const date = flags.date ?? inferredDate;
  const meet = flags.meet ?? (dateIndex === -1 ? undefined : positional.slice(0, dateIndex).join(" ").trim() || undefined);
  const afterDate = dateIndex === -1 ? positional : positional.slice(dateIndex + 1);
  const adaptiveArg = afterDate.find(looksLikeBoolean);

  const adaptive = adaptiveArg === undefined ? flags.adaptive : adaptiveArg === "true";
  const pdfUrls = flags.pdf ?? afterDate.filter(looksLikeUrl);

  return {
    meet,
    date,
    adaptive,
    pdfUrls,
  };
}

function usage(): string {
  return [
    'Usage with built CLI: meetcal usamwResultsScraper --meet "2026 USA Masters Nationals" --date 2026-03-29 --pdf "https://..." --pdf "https://..."',
    'Usage with bunli dev: bunli dev usamwResultsScraper "2026 USA Masters Nationals" 2026-03-29 "https://..." "https://..."',
    "When splitting across lines in zsh, end each continued line with a backslash.",
  ].join("\n");
}

export default defineCommand({
  name: "usamwResultsScraper" as const,
  description: "Export USAMW PDF results as Convex lifting_results seed data",
  options: {
    meet: option(z.string().min(1).optional(), {
      description: "Meet name",
      short: "m",
    }),
    date: option(z.string().min(1).optional(), {
      description: "Meet date in YYYY-MM-DD format",
      short: "d",
    }),
    adaptive: option(z.boolean().default(false), {
      description: "Mark results as adaptive",
      short: "a",
      argumentKind: "flag",
    }),
    pdf: option(z.array(z.string().url()).min(1).optional(), {
      description: "PDF URL. Repeat this flag for multiple PDFs.",
      short: "p",
      repeatable: true,
    }),
  },
  handler: async ({ flags, positional }) => {
    const { meet, date, adaptive, pdfUrls } = parseScraperArgs(flags, positional);

    if (!meet || !date || pdfUrls.length === 0) {
      throw new Error(usage());
    }

    validateDate(date);

    const allResults: LiftingResults[] = [];
    for (const url of pdfUrls) {
      const pdfBytes = await fetchBytes(url);
      const pages = await extractPdfTextItems(pdfBytes);
      allResults.push(...parseResultsFromPages(pages, meet, date, adaptive));
    }

    const downloadsDir = join(homedir(), "Downloads");
    const outputPath = join(downloadsDir, "usamwResultsScraper.ts");

    await mkdir(downloadsDir, { recursive: true });
    await writeFile(outputPath, writeConvexResults(allResults), "utf8");

    console.log(`Wrote ${allResults.length} Convex lifting_results rows to ${outputPath}`);
  },
});
