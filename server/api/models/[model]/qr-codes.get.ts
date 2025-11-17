import { readFile, stat } from "fs/promises";
import { join } from "path";

export default defineEventHandler(async (event) => {
  const model = getRouterParam(event, "model");

  if (!model) {
    throw createError({
      statusCode: 400,
      statusMessage: "Model parameter is required",
    });
  }

  try {
    const config = useRuntimeConfig();
    const qrCodesPath = join(
      process.cwd(),
      config.modelsDir,
      model,
      "qr-codes.pdf"
    );

    // Check if QR codes file exists
    try {
      await stat(qrCodesPath);
    } catch (error) {
      throw createError({
        statusCode: 404,
        statusMessage: `QR codes for model '${model}' not found`,
      });
    }

    // Read the file
    const fileBuffer = await readFile(qrCodesPath);

    // Set headers for PDF download
    setHeader(event, "Content-Type", "application/pdf");
    setHeader(
      event,
      "Content-Disposition",
      `attachment; filename="${model}-qr-codes.pdf"`
    );
    setHeader(event, "Content-Length", fileBuffer.length.toString());

    return fileBuffer;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error serving QR codes:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
