import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

/**
 * Converts CSV, XLS, or XLSX files to JSON format
 * Returns a File object containing the JSON data
 */
export async function convertToJSON(file: File): Promise<File> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (!extension || !['csv', 'xls', 'xlsx'].includes(extension)) {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  const buffer = await file.arrayBuffer();
  let jsonData: any;
  let jsonString: string;

  if (extension === 'csv') {
    // Parse CSV
    const text = new TextDecoder().decode(buffer);
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    jsonData = records;
  } else {
    // Parse Excel (XLS or XLSX)
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Convert all sheets to JSON
    const sheets: Record<string, any[]> = {};
    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet);
    });
    
    // If only one sheet, use its data directly; otherwise use the sheets object
    jsonData = workbook.SheetNames.length === 1 
      ? sheets[workbook.SheetNames[0]] 
      : sheets;
  }

  // Convert to formatted JSON string
  jsonString = JSON.stringify(jsonData, null, 2);

  // Create a new File object with JSON content
  const jsonBlob = new Blob([jsonString], { type: 'application/json' });
  const jsonFileName = file.name.replace(/\.(csv|xlsx?|xls)$/i, '.json');
  
  return new File([jsonBlob], jsonFileName, { type: 'application/json' });
}

/**
 * Checks if a file needs conversion to JSON
 */
export function needsConversion(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? ['csv', 'xls', 'xlsx'].includes(extension) : false;
}
