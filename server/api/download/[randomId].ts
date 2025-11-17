import { readFile } from "fs/promises";
import { join } from "path";
import { lookupToken } from "../../utils/tokens";

export default defineEventHandler(async (event) => {
  const randomId = getRouterParam(event, "randomId");

  if (!randomId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Random ID parameter is required",
    });
  }

  // Validate randomId format (64 hex characters)
  if (!/^[a-f0-9]{32}$/i.test(randomId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid random ID format",
    });
  }

  try {
    const config = useRuntimeConfig();
    const modelsDir = config.modelsDir;

    // Lookup the token to find model and day
    const tokenInfo = await lookupToken(modelsDir, randomId);

    if (!tokenInfo) {
      throw createError({
        statusCode: 404,
        statusMessage: "PDF not found for the provided token",
      });
    }

    const { model, day } = tokenInfo;

    // Construct file path
    const filePath = join(process.cwd(), modelsDir, model, `day-${day}.pdf`);

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
    // If it's already a proper HTTP error (has statusCode), re-throw it
    if (error.statusCode) {
      throw error;
    }

    // File not found or other error
    throw createError({
      statusCode: 404,
      statusMessage: "PDF not found",
    });
  }
});
