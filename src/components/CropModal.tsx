import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { CropArea } from "../lib/canvas";

interface CropModalProps {
  imageUrl: string;
  onCropComplete: (croppedArea: CropArea) => void;
  onCancel: () => void;
}

export function CropModal({
  imageUrl,
  onCropComplete,
  onCancel,
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null,
  );

  const onCropChange = (crop: { x: number; y: number }) => setCrop(crop);
  const onZoomChange = (zoom: number) => setZoom(zoom);

  const onCropCompleteInternal = useCallback(
    (_croppedArea: any, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900 bg-opacity-90">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
        <h2 className="text-xl font-bold">Crop Image</h2>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              croppedAreaPixels && onCropComplete(croppedAreaPixels)
            }
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium"
          >
            Apply Crop
          </button>
        </div>
      </div>

      {/* Cropper Area */}
      <div className="relative flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3} // You can change this (1 for square, 16/9 for wide)
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={onZoomChange}
        />
      </div>

      {/* Footer / Zoom Control */}
      <div className="p-6 bg-gray-800 flex flex-col items-center">
        <label className="text-white text-sm mb-2 font-medium">Zoom</label>
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-full max-w-md h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}
