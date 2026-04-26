import ExcelJS from "exceljs";

const VALID_CATEGORIES = ["escape", "famille", "ambiance", "enfant", "initié", "expert"];

export interface ExcelGameRow {
  name: string;
  category: string;
}

export async function parseGameExcel(buffer: Buffer): Promise<ExcelGameRow[]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Le fichier Excel ne contient aucune feuille.");

  const rows: ExcelGameRow[] = [];

  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    const name        = String(row.getCell(1).value ?? "").trim();
    const categoryRaw = String(row.getCell(2).value ?? "").trim().toLowerCase();
    const category    = VALID_CATEGORIES.includes(categoryRaw) ? categoryRaw : "famille";
    if (name) rows.push({ name, category });
  });

  return rows;
}
