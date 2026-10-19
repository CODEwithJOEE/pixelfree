import { useState } from "react";
import { convertImage } from "../lib/canvas";
import type { ImageFormat } from "../types";

export function useImageConversion() {
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add backgroundColor to the arguments
  const convert = async (
    file: File,
    format: ImageFormat,
    quality: number = 0.9,
    backgroundColor: string = "#FFFFFF",
  ): Promise<Blob | null> => {
    setIsConverting(true);
    setError(null);

    try {
      // Pass it correctly
      const resultBlob = await convertImage(
        file,
        format,
        quality,
        backgroundColor,
      );
      return resultBlob;
    } catch (err) {
      console.error(err);
      setError("Failed to convert image. Please try again.");
      return null;
    } finally {
      setIsConverting(false);
    }
  };

  return { convert, isConverting, error };
}
