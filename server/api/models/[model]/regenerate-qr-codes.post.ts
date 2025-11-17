import { stat } from "fs/promises";
import { join } from "path";
import { generateQRCodePDF } from "../../../../script/generate-qr-codes.js";
import { readTokens } from "../../../utils/tokens";

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
    const modelDir = join(process.cwd(), config.modelsDir, model);

    // Check if model directory exists
    try {
      await stat(modelDir);
    } catch (error) {
      throw createError({
        statusCode: 404,
        statusMessage: `Model '${model}' not found`,
      });
    }

    // Read existing tokens for this model
    const tokensFile = await readTokens(config.modelsDir, model);
    if (!tokensFile || !tokensFile.tokens) {
      throw createError({
        statusCode: 400,
        statusMessage: `No tokens found for model '${model}'. Cannot regenerate QR codes.`,
      });
    }

    // Get current baseUrl from public runtime config
    const baseUrl = config.public.baseUrl || "http://localhost:3000";

    // Regenerate QR codes PDF with current baseUrl and existing tokens
    await generateQRCodePDF(
      model,
      baseUrl,
      config.modelsDir,
      tokensFile.tokens
    );

    return {
      success: true,
      message: `QR codes for model '${model}' regenerated successfully`,
      modelName: model,
    };
  } catch (error) {
    // If it's already a proper HTTP error (has statusCode), re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Extract error message from Error instances
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("Error regenerating QR codes:", errorMessage);

    throw createError({
      statusCode: 500,
      statusMessage: errorMessage || "Internal server error",
    });
  }
});

