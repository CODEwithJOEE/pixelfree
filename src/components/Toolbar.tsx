import { useState } from "react";
import type { ImageFormat } from "../types";

interface ToolbarProps {
  onConvert: (format: ImageFormat, color: string, quality: number) => void;
  onFormatOrQualityChange: (
    format: ImageFormat,
    color: string,
    quality: number,
  ) => void;
  onRemoveBackground: () => void;
  onCrop: () => void;
  onEditManually: () => void;
  isConverting: boolean;
  isRemovingBg: boolean;
  hasResult: boolean;
}

export function Toolbar({
  onConvert,
  onFormatOrQualityChange,
  onRemoveBackground,
  onCrop,
  onEditManually,
  isConverting,
  isRemovingBg,
  hasResult,
}: ToolbarProps) {
  const [format, setFormat] = useState<ImageFormat>("image/webp");
  const [bgColor, setBgColor] = useState<string>("#FFFFFF");
  const [quality, setQuality] = useState<number>(0.8);

  const isBusy = isConverting || isRemovingBg;
  const isJpeg = format === "image/jpeg";
  const supportsQuality = format === "image/jpeg" || format === "image/webp";

  const handleUpdate = (
    newFormat: ImageFormat,
    newColor: string,
    newQuality: number,
  ) => {
    setFormat(newFormat);
    setBgColor(newColor);
    setQuality(newQuality);
    onFormatOrQualityChange(newFormat, newColor, newQuality);
  };

  return (
    <div className="w-full max-w-2xl bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-5">
      {/* SECTION 1: Editing Tools */}
      <div className="flex flex-wrap items-center gap-3 w-full border-b border-gray-100 pb-5">
        <button
          onClick={onCrop}
          disabled={isBusy || hasResult}
          className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm flex-1 justify-center sm:flex-none"
        >
          ✂️ Crop
        </button>

        {!hasResult ? (
          <button
            onClick={onRemoveBackground}
            disabled={isBusy}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium py-2 px-5 rounded-md transition-colors flex items-center gap-2 text-sm w-full sm:flex-1 justify-center shadow-sm"
          >
            {isRemovingBg ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                AI Processing...
              </>
            ) : (
              "✨ Remove Background"
            )}
          </button>
        ) : (
          <button
            onClick={onEditManually}
            disabled={isBusy}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-md transition-colors flex items-center gap-2 text-sm w-full sm:flex-1 justify-center shadow-sm"
          >
            🖌️ Manual Edit (Brush)
          </button>
        )}
      </div>

      {/* SECTION 2: Export Settings */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={format}
              onChange={(e) =>
                handleUpdate(e.target.value as ImageFormat, bgColor, quality)
              }
              className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={isBusy}
            >
              <option value="image/webp">WebP Format</option>
              <option value="image/jpeg">JPEG Format</option>
              <option value="image/png">PNG Format</option>
            </select>

            {isJpeg && (
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                <label
                  htmlFor="bgColor"
                  className="text-sm text-gray-600 font-medium"
                >
                  BG Color:
                </label>
                <input
                  type="color"
                  id="bgColor"
                  value={bgColor}
                  onChange={(e) =>
                    handleUpdate(format, e.target.value, quality)
                  }
                  disabled={isBusy}
                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => onConvert(format, bgColor, quality)}
            disabled={isBusy}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-6 rounded-md transition-colors text-sm shadow-sm flex-1 sm:flex-none justify-center"
          >
            {isConverting ? "Saving..." : "Download Image"}
          </button>
        </div>

        {supportsQuality && (
          <div className="flex items-center gap-4 w-full bg-gray-50 p-3 rounded-lg border border-gray-100">
            <label
              htmlFor="quality"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Quality: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              id="quality"
              min="0.1"
              max="1.0"
              step="0.05"
              value={quality}
              onChange={(e) =>
                handleUpdate(format, bgColor, parseFloat(e.target.value))
              }
              disabled={isBusy}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}
