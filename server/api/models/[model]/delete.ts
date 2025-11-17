import { rm } from "fs/promises";
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
    const modelDir = join(process.cwd(), config.modelsDir, model);

    // Check if model directory exists
    try {
      await rm(modelDir, { recursive: true, force: true });
    } catch (error) {
      throw createError({
        statusCode: 404,
        statusMessage: `Model '${model}' not found or could not be deleted`,
      });
    }

    return {
      success: true,
      message: `Model '${model}' deleted successfully`,
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting model:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
