import { writeFile, mkdir, stat, rm, readdir } from "fs/promises";
import { join } from "path";
import { splitPDF } from "../../../script/split-pdf.js";
import { generateQRCodePDF } from "../../../script/generate-qr-codes.js";
import { generateRandomId, writeTokens } from "../../utils/tokens";

export default defineEventHandler(async (event) => {
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event);

    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: "No form data provided",
      });
    }

    let modelName: string | undefined;
    let pdfFile: any;
    let csvFile: any;

    // Extract form fields
    for (const field of formData) {
      if (field.name === "modelName" && field.data) {
        modelName = field.data.toString().trim();
      } else if (field.name === "pdf" && field.filename) {
        pdfFile = field;
      } else if (field.name === "csv" && field.filename) {
        csvFile = field;
      }
    }

    // Validate required fields
    if (!modelName) {
      throw createError({
        statusCode: 400,
        statusMessage: "Model name is required",
      });
    }

    if (!pdfFile) {
      throw createError({
        statusCode: 400,
        statusMessage: "PDF file is required",
      });
    }

    if (!csvFile) {
      throw createError({
        statusCode: 400,
        statusMessage: "CSV file is required",
      });
    }

    // Validate file extensions
    if (!pdfFile.filename?.toLowerCase().endsWith(".pdf")) {
      throw createError({
        statusCode: 400,
        statusMessage: "PDF file must have .pdf extension",
      });
    }

    if (!csvFile.filename?.toLowerCase().endsWith(".csv")) {
      throw createError({
        statusCode: 400,
        statusMessage: "CSV file must have .csv extension",
      });
    }

    // Check if model already exists
    const config = useRuntimeConfig();
    const modelDir = join(process.cwd(), config.modelsDir, modelName);
    try {
      await stat(modelDir);
      throw createError({
        statusCode: 409,
        statusMessage: `Model '${modelName}' already exists`,
      });
    } catch (error) {
      // Directory doesn't exist, which is what we want
      if (error.statusCode === 409) {
        throw error;
      }
    }

    // Create model directory
    let modelDirCreated = false;
    await mkdir(modelDir, { recursive: true });
    modelDirCreated = true;

    try {
      // Save uploaded files
      const pdfPath = join(modelDir, "source.pdf");
      const csvPath = join(modelDir, "source.csv");

      await writeFile(pdfPath, pdfFile.data);
      await writeFile(csvPath, csvFile.data);

      // Process PDF splitting
      await splitPDF(pdfPath, csvPath, modelName, config.modelsDir);

      // Get the actual day numbers from created PDF files
      const files = await readdir(modelDir);
      const pdfFiles = files.filter(
        (file) => file.startsWith("day-") && file.endsWith(".pdf")
      );
      
      // Extract day numbers from filenames
      const dayNumbers = pdfFiles
        .map((file) => {
          const dayNumber = parseInt(
            file.replace("day-", "").replace(".pdf", "")
          );
          return isNaN(dayNumber) ? null : dayNumber;
        })
        .filter((day): day is number => day !== null)
        .sort((a, b) => a - b);

      // Generate tokens for actual days found
      const tokenMappings: Record<string, { day: number }> = {};
      for (const day of dayNumbers) {
        const randomId = generateRandomId();
        tokenMappings[randomId] = { day };
      }
      
      // Save tokens to file
      const tokensFile = { tokens: tokenMappings };
      await writeTokens(config.modelsDir, modelName, tokensFile);

      // Generate QR codes with token mappings using baseUrl from runtime config
      const baseUrl = config.baseUrl || "http://localhost:3000";
      await generateQRCodePDF(
        modelName,
        baseUrl,
        config.modelsDir,
        tokenMappings
      );

      return {
        success: true,
        message: `Model '${modelName}' created successfully`,
        modelName,
      };
    } catch (error) {
      // Cleanup: Delete model directory if it was created
      if (modelDirCreated) {
        try {
          await rm(modelDir, { recursive: true, force: true });
          console.log(`Cleaned up model directory: ${modelDir}`);
        } catch (cleanupError) {
          console.error(`Failed to cleanup model directory ${modelDir}:`, cleanupError);
        }
      }

      // If it's already a proper HTTP error (has statusCode), re-throw it
      if (error.statusCode) {
        throw error;
      }
      
      // Extract error message from Error instances
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error("Error uploading model:", errorMessage);
      
      // Return the specific error message to the client
      throw createError({
        statusCode: 500,
        statusMessage: errorMessage || "Internal server error",
      });
    }
  } catch (error) {
    // Handle errors that occur before model directory creation (validation errors)
    // If it's already a proper HTTP error (has statusCode), re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Extract error message from Error instances
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error("Error uploading model:", errorMessage);
    
    // Return the specific error message to the client
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage || "Internal server error",
    });
  }
});
