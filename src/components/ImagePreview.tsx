import { useState } from "react";

interface ImagePreviewProps {
  originalUrl: string;
  resultUrl?: string;
  fileName: string;
  onReset: () => void;
  fileSize?: number;
}

export function ImagePreview({
  originalUrl,
  resultUrl,
  fileName,
  onReset,
  fileSize,
}: ImagePreviewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  // Determine which URL to show based on the toggle and if a result exists
  const displayUrl = showOriginal ? originalUrl : resultUrl || originalUrl;
  const isShowingResult = !showOriginal && !!resultUrl;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="w-full flex justify-between items-center mb-4 gap-4">
        {/* Left Side: Filename & Size */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h2
            className="text-lg font-semibold text-gray-800 truncate"
            title={!showOriginal && resultUrl ? "Processed Image" : fileName}
          >
            {!showOriginal && resultUrl ? "Processed Image" : fileName}
          </h2>
          {fileSize && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md shrink-0">
              ~{(fileSize / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        {/* Right Side: Controls */}
        <div className="flex items-center gap-4 shrink-0">
          {resultUrl && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showOriginal}
                onChange={(e) => setShowOriginal(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              Show Original
            </label>
          )}
          <button
            onClick={onReset}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Add the checkerboard class here */}
      <div
        className={`w-full rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] border border-gray-100 ${isShowingResult ? "bg-checkerboard" : "bg-gray-100"}`}
      >
        <img
          src={displayUrl}
          alt="Preview"
          className="max-w-full max-h-[500px] object-contain"
        />
      </div>
    </div>
  );
}
