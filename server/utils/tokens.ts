import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

export interface TokenMapping {
  day: number;
}

export interface TokensFile {
  tokens: Record<string, TokenMapping>;
}

/**
 * Generate a 64-character random ID (32 bytes hex encoded)
 */
export function generateRandomId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Get the path to the tokens.json file for a model
 */
export function getTokensFilePath(
  modelsDir: string,
  modelName: string
): string {
  return join(process.cwd(), modelsDir, modelName, "tokens.json");
}

/**
 * Read tokens from a model's tokens.json file
 */
export async function readTokens(
  modelsDir: string,
  modelName: string
): Promise<TokensFile | null> {
  try {
    const tokensPath = getTokensFilePath(modelsDir, modelName);
    const content = await readFile(tokensPath, "utf-8");
    return JSON.parse(content) as TokensFile;
  } catch (error) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Write tokens to a model's tokens.json file
 */
export async function writeTokens(
  modelsDir: string,
  modelName: string,
  tokens: TokensFile
): Promise<void> {
  const tokensPath = getTokensFilePath(modelsDir, modelName);
  await writeFile(tokensPath, JSON.stringify(tokens, null, 2), "utf-8");
}

/**
 * Generate tokens for all days (1-24) for a model
 */
export async function generateTokensForModel(
  modelsDir: string,
  modelName: string,
  totalDays: number = 24
): Promise<Record<string, TokenMapping>> {
  const tokens: Record<string, TokenMapping> = {};

  for (let day = 1; day <= totalDays; day++) {
    const randomId = generateRandomId();
    tokens[randomId] = { day };
  }

  const tokensFile: TokensFile = { tokens };
  await writeTokens(modelsDir, modelName, tokensFile);

  return tokens;
}

/**
 * Lookup model and day by randomId
 * Searches through all model directories
 */
export async function lookupToken(
  modelsDir: string,
  randomId: string
): Promise<{ model: string; day: number } | null> {
  try {
    const modelsPath = join(process.cwd(), modelsDir);

    // Check if models directory exists
    try {
      await stat(modelsPath);
    } catch (error) {
      return null;
    }

    // Read all directories in models
    const entries = await readdir(modelsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const tokens = await readTokens(modelsDir, entry.name);
        if (tokens && tokens.tokens[randomId]) {
          return {
            model: entry.name,
            day: tokens.tokens[randomId].day,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error looking up token:", error);
    return null;
  }
}

/**
 * Get token for a specific model and day
 */
export async function getTokenForDay(
  modelsDir: string,
  modelName: string,
  day: number
): Promise<string | null> {
  const tokens = await readTokens(modelsDir, modelName);
  if (!tokens) {
    return null;
  }

  // Find the token that maps to this day
  for (const [token, mapping] of Object.entries(tokens.tokens)) {
    if (mapping.day === day) {
      return token;
    }
  }

  return null;
}
