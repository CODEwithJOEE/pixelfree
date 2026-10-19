import { useState, useEffect, useRef, useCallback } from "react";

export function useBackgroundRemoval() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize the worker
    workerRef.current = new Worker(
      new URL("../workers/bgRemoval.worker.ts", import.meta.url),
      { type: "module" },
    );

    // Cleanup worker on unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const removeBackground = useCallback((file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return resolve(null);

      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStatusMessage("Initializing...");

      // Handle messages from the worker
      workerRef.current.onmessage = (event) => {
        const { status, message, progress, resultBlob, error } = event.data;

        if (status === "loading_model") {
          setStatusMessage(message);
        } else if (status === "downloading") {
          setStatusMessage(`Downloading AI model: ${progress}%`);
        } else if (status === "processing") {
          setStatusMessage(message);
        } else if (status === "success") {
          setIsProcessing(false);
          setStatusMessage(null);
          resolve(resultBlob);
        } else if (status === "error") {
          setIsProcessing(false);
          setStatusMessage(null);
          setError(error);
          resolve(null);
        }
      };

      // Send the file to the worker
      workerRef.current.postMessage({ file });
    });
  }, []);

  return { removeBackground, isProcessing, statusMessage, error };
}
