export type AppStatus = "idle" | "loading" | "processing" | "success" | "error";

export type ImageFormat = "image/png" | "image/jpeg" | "image/webp";

export interface ProcessedImage {
  original: File;
  previewUrl: string;
  resultBlob?: Blob;
  resultUrl?: string;
}
