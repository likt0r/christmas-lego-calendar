import { readdir } from "fs/promises";
import { join } from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { readFile } from "fs/promises";

export default defineEventHandler(async (event) => {
    const model = getRouterParam(event, "model");

    if (!model) {
        throw createError({
            statusCode: 400,
            statusMessage: "Model parameter is required",
        });
    }

    const modelsDir = useRuntimeConfig().modelsDir;
    const modelDir = join(process.cwd(), modelsDir, model);

    try {
        // Read all PDF files in the model directory
        const files = await readdir(modelDir);
        const pdfFiles = files
            .filter((file) => file.startsWith("day-") && file.endsWith(".pdf"))
            .map((file) => ({
                filename: file,
                day: parseInt(file.replace("day-", "").replace(".pdf", "")),
            }))
            .sort((a, b) => a.day - b.day);

        if (pdfFiles.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: `No PDF files found for model '${model}'`,
            });
        }

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();
        const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

        // Process each day
        for (const { filename, day } of pdfFiles) {
            // Add separator page
            const separatorPage = mergedPdf.addPage([595.28, 841.89]); // A4 size
            const { width, height } = separatorPage.getSize();

            // Draw separator text
            const text = `Day ${day}`;
            const fontSize = 48;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const textHeight = fontSize;

            separatorPage.drawText(text, {
                x: (width - textWidth) / 2,
                y: (height - textHeight) / 2,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });

            // Add a decorative line
            separatorPage.drawLine({
                start: { x: 50, y: height / 2 - 40 },
                end: { x: width - 50, y: height / 2 - 40 },
                thickness: 2,
                color: rgb(0, 0, 0),
            });

            // Read and merge the day's PDF
            const dayPdfPath = join(modelDir, filename);
            const dayPdfBytes = await readFile(dayPdfPath);
            const dayPdf = await PDFDocument.load(dayPdfBytes);

            // Copy all pages from the day's PDF
            const copiedPages = await mergedPdf.copyPages(
                dayPdf,
                dayPdf.getPageIndices()
            );
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        // Save the merged PDF
        const pdfBytes = await mergedPdf.save();

        // Set response headers
        setResponseHeaders(event, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="lego-calendar-${model}-backup.pdf"`,
            "Content-Length": pdfBytes.length.toString(),
        });

        return pdfBytes;
    } catch (error) {
        if (error && typeof error === "object" && "statusCode" in error) {
            throw error;
        }
        console.error("Error generating PDF backup:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to generate PDF backup",
        });
    }
});
