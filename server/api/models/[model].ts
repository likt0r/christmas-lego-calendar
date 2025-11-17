import { readdir, stat } from "fs/promises";
import { join } from "path";
import { readTokens, getTokenForDay } from "../../utils/tokens";

export default defineEventHandler(async (event) => {
  const model = getRouterParam(event, "model");

  const modelsDir = useRuntimeConfig().modelsDir;

  if (!model) {
    throw createError({
      statusCode: 400,
      statusMessage: "Model parameter is required",
    });
  }

  try {
    const modelDir = join(process.cwd(), modelsDir, model);

    // Check if model directory exists
    try {
      await stat(modelDir);
    } catch (error) {
      throw createError({
        statusCode: 404,
        statusMessage: `Model '${model}' not found`,
      });
    }

    // Read all PDF files in the model directory
    const files = await readdir(modelDir);
    const pdfFiles = files.filter(
      (file) => file.startsWith("day-") && file.endsWith(".pdf")
    );

    // Read tokens for this model
    const tokens = await readTokens(modelsDir, model);

    // Extract day numbers and get URLs
    const daysWithUrls = await Promise.all(
      pdfFiles.map(async (file) => {
        const dayNumber = parseInt(
          file.replace("day-", "").replace(".pdf", "")
        );

        // Get secure download token for this day
        let url: string;
        if (tokens) {
          const token = await getTokenForDay(modelsDir, model, dayNumber);
          if (token) {
            url = `/api/download/${token}`;
          } else {
            // Fallback to old URL if token not found
            url = `/api/models/${model}/${dayNumber}.pdf`;
          }
        } else {
          // Fallback to old URL if tokens file doesn't exist
          url = `/api/models/${model}/${dayNumber}.pdf`;
        }

        return {
          day: dayNumber,
          filename: file,
          url,
        };
      })
    );

    // Sort by day number
    const days = daysWithUrls.sort((a, b) => a.day - b.day);

    return {
      model,
      days,
      totalDays: days.length,
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Error reading model days:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
