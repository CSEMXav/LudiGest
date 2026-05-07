import ExcelJS from "exceljs";

const VALID_CATEGORIES = ["escape", "famille", "ambiance", "enfant", "initié", "expert"];

export interface ExcelGameRow {
  name: string;
  category: string;
  addedAt: Date;
  bggId?: string;
  barcode?: string;
}

function parseDate(value: ExcelJS.CellValue): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  // Formats : DD/MM/YYYY ou YYYY-MM-DD
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(`${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`);
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

export async function parseGameExcel(buffer: Buffer): Promise<ExcelGameRow[]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Le fichier Excel ne contient aucune feuille.");

  const today = new Date();
  const rows: ExcelGameRow[] = [];

  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    const name        = String(row.getCell(1).value ?? "").trim();
    const categoryRaw = String(row.getCell(2).value ?? "").trim().toLowerCase();
    const category    = VALID_CATEGORIES.includes(categoryRaw) ? categoryRaw : "famille";
    const addedAt     = parseDate(row.getCell(3).value) ?? today;
    const bggIdRaw    = String(row.getCell(4).value ?? "").trim();
    const barcodeRaw  = String(row.getCell(5).value ?? "").trim();
    const bggId       = bggIdRaw || undefined;
    const barcode     = barcodeRaw || undefined;
    if (name) rows.push({ name, category, addedAt, bggId, barcode });
  });

  return rows;
}
