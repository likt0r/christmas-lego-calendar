import { readFile } from "fs/promises";
import { join } from "path";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: "Path parameter is required",
    });
  }

  // Parse the path to extract model and day
  const pathParts = path.split("/");

  if (pathParts.length !== 3 || pathParts[0] !== "models") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid path format. Expected: /models/model/day.pdf",
    });
  }

  const [, model, filename] = pathParts;

  // Validate filename format (day.pdf)
  if (!filename.endsWith(".pdf")) {
    throw createError({
      statusCode: 400,
      statusMessage: "File must be a PDF",
    });
  }

  const dayNumber = filename.replace(".pdf", "");

  // Validate day number
  if (!/^\d+$/.test(dayNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid day number",
    });
  }

  try {
    const config = useRuntimeConfig();
    // Construct file path
    const filePath = join(
      process.cwd(),
      config.modelsDir,
      model,
      `day-${dayNumber}.pdf`
    );

    // Read the PDF file
    const pdfBuffer = await readFile(filePath);

    // Set appropriate headers
    setHeader(event, "Content-Type", "application/pdf");
    setHeader(
      event,
      "Content-Disposition",
      `inline; filename="day-${dayNumber}.pdf"`
    );
    setHeader(event, "Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return pdfBuffer;
  } catch (error) {
    // File not found or other error
    throw createError({
      statusCode: 404,
      statusMessage: `PDF not found for day ${dayNumber} in model ${model}`,
    });
  }
});
