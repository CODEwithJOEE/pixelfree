import { useEffect, useRef, useState, useCallback } from "react";

interface BrushEditorProps {
  originalUrl: string;
  resultUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export function BrushEditor({
  originalUrl,
  resultUrl,
  onSave,
  onCancel,
}: BrushEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [mode, setMode] = useState<"erase" | "restore">("erase");

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const [cursorScreenPos, setCursorScreenPos] = useState({
    x: -1000,
    y: -1000,
  });
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  // Store the actual displayed size of the canvas in screen pixels
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const dimensions = useRef({ width: 0, height: 0 });

  // History for Undo/Redo
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1,
      );
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (historyRef.current.length >= 20) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    historyRef.current.push(imageData);
  };

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      }
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "e" || e.key === "E") {
        setMode("erase");
      } else if (e.key === "r" || e.key === "R") {
        setMode("restore");
      } else if (e.key === "[") {
        setBrushSize((prev) => Math.max(10, prev - 5));
      } else if (e.key === "]") {
        setBrushSize((prev) => Math.min(200, prev + 5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const aiImg = new Image();
    const origImg = new Image();

    aiImg.crossOrigin = "anonymous";
    origImg.crossOrigin = "anonymous";

    aiImg.onload = () => {
      canvas.width = aiImg.width;
      canvas.height = aiImg.height;
      dimensions.current = { width: aiImg.width, height: aiImg.height };

      // Update the display size state
      const rect = canvas.getBoundingClientRect();
      setDisplaySize({ width: rect.width, height: rect.height });

      ctx.drawImage(aiImg, 0, 0);

      historyRef.current = [];
      historyIndexRef.current = -1;
      saveHistory();
    };

    origImg.onload = () => {
      originalImgRef.current = origImg;
    };

    aiImg.src = resultUrl;
    origImg.src = originalUrl;

    // Add a resize listener to keep display size accurate
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDisplaySize({ width: rect.width, height: rect.height });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [originalUrl, resultUrl]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Update display size in case it changed
    if (rect.width !== displaySize.width) {
      setDisplaySize({ width: rect.width, height: rect.height });
    }

    const currentScale = canvas.width / rect.width;
    setScale(currentScale);

    // Mouse position relative to screen
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    setCursorScreenPos({ x: screenX, y: screenY });

    // Mouse position relative to actual image pixels
    const canvasX = screenX * currentScale;
    const canvasY = screenY * currentScale;

    // PERFECT MATH:
    // The background size is the ACTUAL screen size of the image.
    // We offset the image so that (screenX, screenY) becomes the center of the circle.
    const radius = brushSize / 2;
    setBgPos({
      x: radius - screenX,
      y: radius - screenY,
    });

    if (isDrawing) {
      draw(canvasX, canvasY, currentScale);
    }
  };

  const draw = (canvasX: number, canvasY: number, currentScale: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const actualBrushSize = brushSize * currentScale;
    const radius = actualBrushSize / 2;

    if (modeRef.current === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (modeRef.current === "restore" && originalImgRef.current) {
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        originalImgRef.current,
        0,
        0,
        dimensions.current.width,
        dimensions.current.height,
      );
      ctx.restore();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const currentScale = canvasRef.current!.width / rect.width;
    const canvasX = (e.clientX - rect.left) * currentScale;
    const canvasY = (e.clientY - rect.top) * currentScale;
    draw(canvasX, canvasY, currentScale);
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      "image/png",
      1,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900 bg-opacity-95 p-4">
      <div className="flex flex-wrap items-center justify-between bg-gray-800 p-4 rounded-t-xl text-white gap-4">
        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
          <button
            onClick={() => setMode("erase")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              mode === "erase"
                ? "bg-red-600"
                : "hover:bg-gray-700 text-gray-300"
            }`}
          >
            🧽 Erase (E)
          </button>
          <button
            onClick={() => setMode("restore")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              mode === "restore"
                ? "bg-green-600"
                : "hover:bg-gray-700 text-gray-300"
            }`}
          >
            🖌️ Restore (R)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndexRef.current <= 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-md"
            title="Undo (Ctrl+Z)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              ></path>
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={historyIndexRef.current >= historyRef.current.length - 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-md"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
              ></path>
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium w-24">Size: {brushSize}px</span>
          <input
            type="range"
            min="10"
            max="200"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="accent-blue-500 cursor-pointer w-48"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-800 rounded-b-xl flex items-center justify-center overflow-hidden relative p-4">
        <div className="relative shadow-2xl bg-checkerboard max-w-full max-h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              handlePointerUp();
              setIsHovering(false);
            }}
            onPointerEnter={() => setIsHovering(true)}
            className="max-w-full max-h-[75vh] object-contain cursor-none touch-none"
          />

          {/* ENHANCED CUSTOM BRUSH CURSOR */}
          {isHovering && (
            <div
              className={`absolute pointer-events-none rounded-full z-50 overflow-hidden transition-colors ${
                mode === "erase" ? "border-red-500" : "border-green-500"
              }`}
              style={{
                width: `${brushSize}px`,
                height: `${brushSize}px`,
                left: `${cursorScreenPos.x - brushSize / 2}px`,
                top: `${cursorScreenPos.y - brushSize / 2}px`,
                borderWidth: "2px",
                borderStyle: "solid",
                boxShadow:
                  "0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.3)",
                backgroundColor:
                  mode === "erase" ? "rgba(255,0,0,0.1)" : "transparent",
              }}
            >
              {mode === "restore" && (
                <div
                  className="w-full h-full opacity-60"
                  style={{
                    backgroundImage: `url(${originalUrl})`,
                    // 1. I-set ang background size sa totoong pixels ng original image
                    backgroundSize: `${dimensions.current.width}px ${dimensions.current.height}px`,
                    // 2. I-offset base sa scale (screen size / actual size)
                    backgroundPosition: `${brushSize / 2 - cursorScreenPos.x * (dimensions.current.width / (canvasRef.current?.getBoundingClientRect().width || 1))}px ${brushSize / 2 - cursorScreenPos.y * (dimensions.current.height / (canvasRef.current?.getBoundingClientRect().height || 1))}px`,
                    backgroundRepeat: "no-repeat",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
