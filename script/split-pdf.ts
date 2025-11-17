#!/usr/bin/env bun

import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { createReadStream } from "fs";

interface DayData {
  day: number;
  stepStart: number;
  stepEnd: number;
  pageStart: number;
  pageEnd: number;
}

async function promptInput(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function parseCSV(csvPath: string): Promise<DayData[]> {
  return new Promise((resolve, reject) => {
    const results: DayData[] = [];

    createReadStream(csvPath)
      .pipe(csv())
      .on("data", (data) => {
        // Skip rows without valid day number
        const day = parseInt(data.day);
        if (!day || isNaN(day)) {
          return; // Skip invalid rows (header, summary, empty rows)
        }

        // Validate that required fields are present and valid
        const stepStart = parseInt(data.step_start);
        const stepEnd = parseInt(data.step_end);
        const pageStart = parseInt(data.page_start);
        const pageEnd = parseInt(data.page_end);

        // Skip rows with invalid numeric values
        if (
          isNaN(stepStart) ||
          isNaN(stepEnd) ||
          isNaN(pageStart) ||
          isNaN(pageEnd)
        ) {
          return; // Skip rows with invalid data
        }

        const dayData: DayData = {
          day: day, // Use the day column from CSV
          stepStart: stepStart,
          stepEnd: stepEnd,
          pageStart: pageStart,
          pageEnd: pageEnd,
        };

        results.push(dayData);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

export async function splitPDF(
  pdfPath: string,
  csvPath: string,
  modelName: string,
  modelsDir: string = "models"
) {
  try {
    console.log("📖 Reading PDF...");
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    console.log(`PDF has ${totalPages} pages`);

    console.log("📊 Parsing CSV...");
    const dayData = await parseCSV(csvPath);
    console.log(`Found ${dayData.length} days in CSV`);

    // Validate CSV data
    for (const day of dayData) {
      if (day.pageStart < 1 || day.pageEnd < 1) {
        throw new Error(
          `Day ${day.day}: Invalid page numbers (pageStart: ${day.pageStart}, pageEnd: ${day.pageEnd}). Pages must be 1-based.`
        );
      }
      if (day.pageStart > day.pageEnd) {
        throw new Error(
          `Day ${day.day}: pageStart (${day.pageStart}) is greater than pageEnd (${day.pageEnd})`
        );
      }
      if (day.pageStart > totalPages || day.pageEnd > totalPages) {
        throw new Error(
          `Day ${day.day}: Page range (${day.pageStart}-${day.pageEnd}) exceeds total pages (${totalPages})`
        );
      }
    }

    // Create output directory
    const outputDir = path.join(process.cwd(), modelsDir, modelName);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("✂️  Splitting PDF...");

    for (const day of dayData) {
      try {
        console.log(
          `Processing day ${day.day}: pages ${day.pageStart}-${day.pageEnd}`
        );

        // Validate page range for this day
        if (day.pageStart < 1 || day.pageEnd < 1) {
          throw new Error(
            `Invalid page numbers: pageStart=${day.pageStart}, pageEnd=${day.pageEnd}`
          );
        }
        if (day.pageStart > day.pageEnd) {
          throw new Error(
            `pageStart (${day.pageStart}) > pageEnd (${day.pageEnd})`
          );
        }
        if (day.pageEnd > totalPages) {
          throw new Error(
            `pageEnd (${day.pageEnd}) exceeds total pages (${totalPages})`
          );
        }

        // Create new PDF document for this day
        const newPdf = await PDFDocument.create();

        // Calculate page indices (convert from 1-based to 0-based)
        const pageIndices = Array.from(
          { length: day.pageEnd - day.pageStart + 1 },
          (_, i) => day.pageStart - 1 + i
        );

        // Validate all indices are within bounds
        const invalidIndices = pageIndices.filter(
          (idx) => idx < 0 || idx >= totalPages
        );
        if (invalidIndices.length > 0) {
          throw new Error(
            `Invalid page indices: ${invalidIndices.join(", ")}. Valid range: 0-${totalPages - 1}`
          );
        }

        // Copy pages from original PDF
        const pages = await newPdf.copyPages(pdfDoc, pageIndices);

        // Add pages to new document
        pages.forEach((page) => newPdf.addPage(page));

        // Save the new PDF
        const pdfBytes = await newPdf.save();
        const outputPath = path.join(outputDir, `day-${day.day}.pdf`);
        fs.writeFileSync(outputPath, pdfBytes);

        console.log(`✅ Created: ${outputPath}`);
      } catch (error) {
        console.error(
          `❌ Error processing day ${day.day}:`,
          error instanceof Error ? error.message : error
        );
        // Continue with next day instead of stopping
        continue;
      }
    }

    console.log(
      `\n🎉 Successfully created ${dayData.length} PDF files in ${modelsDir}/${modelName}/`
    );
    console.log(
      `📱 Access them via: http://localhost:3000/models/${modelName}/<day>.pdf`
    );
  } catch (error) {
    console.error("❌ Error:", error);
    // Re-throw the error so it can be caught by the calling API endpoint
    // Only use process.exit(1) when running as a standalone script (in main())
    throw error;
  }
}

async function main() {
  console.log("🎄 LEGO December Calendar PDF Splitter\n");

  // Get command line arguments
  const args = process.argv.slice(2);

  let pdfPath: string;
  let csvPath: string;
  let modelName: string;

  if (args.length >= 3) {
    // Use command line arguments
    pdfPath = args[0];
    csvPath = args[1];
    modelName = args[2];
    console.log(
      `Using arguments: PDF=${pdfPath}, CSV=${csvPath}, Model=${modelName}`
    );
  } else {
    // Use interactive prompts
    pdfPath = await promptInput("📄 Enter PDF path: ");
    csvPath = await promptInput("📊 Enter CSV path: ");
    modelName = await promptInput("🏷️  Enter model name: ");
  }

  // Validate inputs
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found: ${pdfPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  try {
    await splitPDF(pdfPath, csvPath, modelName);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script only if called directly
if (typeof import.meta !== "undefined" && import.meta.main) {
  main().catch(console.error);
}
