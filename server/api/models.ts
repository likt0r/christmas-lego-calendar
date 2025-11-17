import { readdir, stat } from "fs/promises";
import { join } from "path";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const modelsDir = join(process.cwd(), config.modelsDir);

    // Check if models directory exists
    try {
      await stat(modelsDir);
    } catch (error) {
      // Models directory doesn't exist
      return [];
    }

    // Read all directories in models
    const entries = await readdir(modelsDir, { withFileTypes: true });
    const models = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const modelPath = join(modelsDir, entry.name);

        // Count PDF files in the model directory
        const files = await readdir(modelPath);
        const pdfFiles = files.filter(
          (file) => file.startsWith("day-") && file.endsWith(".pdf")
        );

        if (pdfFiles.length > 0) {
          models.push({
            name: entry.name,
            days: pdfFiles.length,
          });
        }
      }
    }

    return models;
  } catch (error) {
    console.error("Error reading models:", error);
    return [];
  }
});
