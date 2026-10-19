import { useState, useEffect } from "react";
import { Uploader } from "./components/Uploader";
import { ImagePreview } from "./components/ImagePreview";
import { Toolbar } from "./components/Toolbar";
import { useImageConversion } from "./hooks/useImageConversion";
import { useBackgroundRemoval } from "./hooks/useBackgroundRemoval";
import type { ImageFormat } from "./types";
import { CropModal } from "./components/CropModal";
import { getCroppedImg } from "./lib/canvas";
import { BrushEditor } from "./components/BrushEditor";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  const [resultFile, setResultFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Add state for preview blob to handle real-time quality changes
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  const {
    convert,
    isConverting,
    error: conversionError,
  } = useImageConversion();
  const {
    removeBackground,
    isProcessing: isRemovingBg,
    statusMessage,
    error: bgError,
  } = useBackgroundRemoval();

  const [isCropping, setIsCropping] = useState(false);

  // Handle Original URL
  useEffect(() => {
    if (!file) {
      setOriginalUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Handle Result URL (The AI transparent image)
  useEffect(() => {
    if (!resultFile) {
      setResultUrl(null);
      setPreviewBlob(null); // Reset preview blob when AI result is cleared
      return;
    }
    const url = URL.createObjectURL(resultFile);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resultFile]);

  // Handle Preview Blob URL (The compressed version for the screen)
  useEffect(() => {
    if (!previewBlob) {
      setPreviewBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewBlob);
    setPreviewBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewBlob]);

  const handleImageSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResultFile(null);
    setPreviewBlob(null);
  };

  const handleReset = () => {
    setFile(null);
    setResultFile(null);
    setPreviewBlob(null);
  };

  const handleRemoveBg = async () => {
    if (!file) return;
    const blob = await removeBackground(file);
    if (blob) {
      const newFile = new File([blob], "removed-bg.png", { type: "image/png" });
      setResultFile(newFile);
      setPreviewBlob(null); // AI output is PNG, no need to compress for initial view
    }
  };

  const handleSettingsChange = async (
    format: ImageFormat,
    color: string,
    quality: number,
  ) => {
    const fileToConvert = resultFile || file;
    if (!fileToConvert) return;

    // Pass quality 3rd, color 4th
    const blob = await convert(fileToConvert, format, quality, color);
    if (blob) {
      setPreviewBlob(blob);
    }
  };

  const handleManualSave = (newBlob: Blob) => {
    const newFile = new File([newBlob], "edited-bg.png", { type: "image/png" });
    setResultFile(newFile); // Overwrite the AI result with the edited one
    setIsEditing(false); // Close the editor
  };

  const handleConvert = async (
    format: ImageFormat,
    color: string,
    quality: number,
  ) => {
    const fileToConvert = resultFile || file;
    if (!fileToConvert) return;

    // Pass quality 3rd, color 4th
    const resultBlob =
      previewBlob || (await convert(fileToConvert, format, quality, color));
    if (!resultBlob) return;

    const downloadUrl = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");

    const originalName = fileToConvert.name.split(".")[0];
    const extension = format === "image/jpeg" ? "jpg" : format.split("/")[1];

    a.href = downloadUrl;
    a.download = `${originalName}-pixelfree.${extension}`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const displayError = bgError || conversionError;

  // Determine what to show in the preview
  const imageToDisplayUrl = previewBlobUrl || resultUrl || originalUrl;
  const handleCropComplete = async (croppedArea: any) => {
    if (!file || !originalUrl) return;

    try {
      // Generate the cropped image blob
      const croppedBlob = await getCroppedImg(
        originalUrl,
        croppedArea,
        file.type as any,
      );

      // Create a new File from the blob
      const croppedFile = new File([croppedBlob], file.name, {
        type: file.type,
      });

      // Update the state with the new cropped file
      setFile(croppedFile);
      setResultFile(null); // Reset AI result if they crop again
      setPreviewBlob(null);
      setIsCropping(false); // Close modal
    } catch (error) {
      console.error("Failed to crop image", error);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Pixelfree
        </h1>
        <p className="mt-2 text-lg text-gray-500">
          Remove backgrounds and convert formats entirely in your browser.
        </p>
      </header>

      <main className="w-full flex flex-col items-center gap-6">
        {!file || !originalUrl ? (
          <Uploader onImageSelect={handleImageSelect} />
        ) : (
          <>
            {/* Render the Modal if isCropping is true */}
            {isCropping && (
              <CropModal
                imageUrl={originalUrl}
                onCropComplete={handleCropComplete}
                onCancel={() => setIsCropping(false)}
              />
            )}
            {isEditing && resultUrl && originalUrl && (
              <BrushEditor
                originalUrl={originalUrl}
                resultUrl={resultUrl}
                onSave={handleManualSave}
                onCancel={() => setIsEditing(false)}
              />
            )}
            <ImagePreview
              originalUrl={originalUrl}
              resultUrl={imageToDisplayUrl || undefined}
              fileName={file.name}
              onReset={handleReset}
              fileSize={previewBlob?.size || resultFile?.size || file?.size}
            />

            <Toolbar
              onCrop={() => setIsCropping(true)}
              onConvert={handleConvert}
              onFormatOrQualityChange={handleSettingsChange}
              onRemoveBackground={handleRemoveBg}
              isConverting={isConverting}
              isRemovingBg={isRemovingBg}
              hasResult={!!resultFile}
              onEditManually={() => setIsEditing(true)}
            />

            {statusMessage && (
              <div className="text-purple-600 font-medium text-sm animate-pulse bg-purple-50 py-2 px-4 rounded-full">
                {statusMessage}
              </div>
            )}
            {displayError && (
              <p className="text-red-500 text-sm font-medium bg-red-50 py-2 px-4 rounded-lg">
                {displayError}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
