export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  isRed: boolean;
};

export type UsamwScraperArgs = {
  meet?: string;
  date?: string;
  adaptive: boolean;
  pdfUrls: string[];
};
