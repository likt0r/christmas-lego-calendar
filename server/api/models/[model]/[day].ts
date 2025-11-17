import { readFile } from "fs/promises";
import { join } from "path";

export default defineEventHandler(async (event) => {
  const model = getRouterParam(event, "model");
  const dayParam = getRouterParam(event, "day");

  if (!model) {
    throw createError({
      statusCode: 400,
      statusMessage: "Model parameter is required",
    });
  }

  if (!dayParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "Day parameter is required",
    });
  }

  // Extract day number from parameter (remove .pdf extension if present)
  const day = dayParam.replace(".pdf", "");

  // Validate day number
  if (!/^\d+$/.test(day)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid day number",
    });
  }

  try {
    const config = useRuntimeConfig();
    // Construct file path
    const filePath = join(process.cwd(), config.modelsDir, model, `day-${day}.pdf`);

    // Read the PDF file
    const pdfBuffer = await readFile(filePath);

    // Set appropriate headers
    setHeader(event, "Content-Type", "application/pdf");
    setHeader(
      event,
      "Content-Disposition",
      `inline; filename="day-${day}.pdf"`
    );
    setHeader(event, "Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return pdfBuffer;
  } catch (error) {
    // File not found or other error
    throw createError({
      statusCode: 404,
      statusMessage: `PDF not found for day ${day} in model ${model}`,
    });
  }
});
