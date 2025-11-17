#!/usr/bin/env bun

import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

async function promptInput(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function generateQRCode(data: string): Promise<Buffer> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Convert data URL to buffer
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "");
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`);
  }
}

export async function generateQRCodePDF(
  modelName: string,
  baseUrl: string,
  modelsDir: string = "models",
  tokenMappings?: Record<string, { day: number }>
) {
  try {
    console.log("🎯 Generating QR Code PDF...");

    // Get model initial (first letter, uppercase)
    const modelInitial = modelName.charAt(0).toUpperCase();

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // A4 page dimensions (in points)
    const pageWidth = 595.28;
    const pageHeight = 841.89;

    // QR code layout settings
    const qrSize = 180; // Slightly smaller QR codes
    const cols = 2;
    const rows = 3;
    const qrCodesPerPage = cols * rows;

    // Calculate spacing - tighter layout
    const margin = 40; // Smaller margins
    const availableWidth = pageWidth - 2 * margin;
    const availableHeight = pageHeight - 2 * margin;

    const colSpacing = (availableWidth - cols * qrSize) / (cols - 1);
    const rowSpacing = (availableHeight - rows * qrSize - 60) / (rows - 1); // Better distribution with labels

    let currentPage = null;
    let qrIndex = 0;

    // Determine how many days to generate QR codes for
    let daysToProcess: number[];
    if (tokenMappings) {
      // Extract unique days from token mappings and sort them
      const days = new Set(
        Object.values(tokenMappings).map((mapping) => mapping.day)
      );
      daysToProcess = Array.from(days).sort((a, b) => a - b);
    } else {
      // Fallback to 24 days if no token mappings provided
      daysToProcess = Array.from({ length: 24 }, (_, i) => i + 1);
    }

    // Generate QR codes for each day
    for (const day of daysToProcess) {
      // Create new page if needed
      if (qrIndex % qrCodesPerPage === 0) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        qrIndex = 0;
      }

      // Calculate position on current page
      const col = qrIndex % cols;
      const row = Math.floor(qrIndex / cols);

      const x = margin + col * (qrSize + colSpacing);
      const y =
        pageHeight - margin - (row + 1) * qrSize - row * rowSpacing - 20; // Better positioning

      // Find the token for this day
      let randomId: string;
      if (tokenMappings) {
        const tokenEntry = Object.entries(tokenMappings).find(
          ([_, mapping]) => mapping.day === day
        );
        if (!tokenEntry) {
          console.warn(`No token found for day ${day}, skipping...`);
          continue;
        }
        randomId = tokenEntry[0];
      } else {
        // Fallback: generate a placeholder (should not happen in production)
        randomId = "placeholder-token";
      }

      // Generate QR code data with secure download URL
      const qrData = `${modelInitial}-${day}:${baseUrl}/api/download/${randomId}`;
      console.log(`Generating QR code for day ${day}: ${qrData}`);

      // Generate QR code
      const qrBuffer = await generateQRCode(qrData);

      // Embed QR code image in PDF
      const qrImage = await pdfDoc.embedPng(qrBuffer);

      // Draw QR code
      currentPage.drawImage(qrImage, {
        x: x,
        y: y - 25, // Space for label
        width: qrSize,
        height: qrSize,
      });

      // Add day label with model initial
      currentPage.drawText(`${modelInitial}-${day}`, {
        x: x + qrSize / 2 - 20, // Center the text
        y: y - 35,
        size: 11, // Slightly smaller text
        color: rgb(0, 0, 0),
      });

      qrIndex++;
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(
      process.cwd(),
      modelsDir,
      modelName,
      "qr-codes.pdf"
    );

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`\n🎉 Successfully created QR code PDF: ${outputPath}`);
    console.log(`📱 QR codes contain: ${modelInitial}-{day}:{url}`);
    console.log(`📄 PDF contains 4 pages with 6 QR codes each`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

async function main() {
  console.log("🎄 LEGO December Calendar QR Code Generator\n");

  // Get command line arguments
  const args = process.argv.slice(2);

  let modelName: string;
  let baseUrl: string;

  if (args.length >= 2) {
    // Use command line arguments
    modelName = args[0];
    baseUrl = args[1];
    console.log(`Using arguments: Model=${modelName}, BaseURL=${baseUrl}`);
  } else {
    // Use interactive prompts
    modelName = await promptInput("🏷️  Enter model name: ");
    baseUrl = await promptInput(
      "🌐 Enter base URL (e.g., http://localhost:3000): "
    );
  }

  // Validate inputs
  if (!modelName || modelName.trim() === "") {
    console.error("❌ Model name is required");
    process.exit(1);
  }

  if (!baseUrl || baseUrl.trim() === "") {
    console.error("❌ Base URL is required");
    process.exit(1);
  }

  // Clean up base URL (remove trailing slash)
  baseUrl = baseUrl.replace(/\/$/, "");

  await generateQRCodePDF(modelName, baseUrl);
}

// Run the script only if called directly
if (typeof import.meta !== "undefined" && import.meta.main) {
  main().catch(console.error);
}
