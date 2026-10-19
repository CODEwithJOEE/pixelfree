import {
  AutoModel,
  AutoProcessor,
  RawImage,
  env,
} from "@huggingface/transformers";

env.allowLocalModels = false;

let model: any = null;
let processor: any = null;

self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const { file } = event.data;

    if (!model || !processor) {
      self.postMessage({
        status: "loading_model",
        message: "Downloading AI model (MODNet)...",
      });

      // Palitan natin ang model sa MODNet
      // Ayon sa docs, kailangan ng dtype: 'fp32' para gumana nang maayos
      model = await AutoModel.from_pretrained("Xenova/modnet", {
        dtype: "fp32", // Importante ito para sa MODNet
        progress_callback: (progress: any) => {
          if (progress.status === "progress") {
            self.postMessage({
              status: "downloading",
              progress: Math.round(progress.progress),
            });
          }
        },
      });

      // Ang processor ay mas simple para sa MODNet, walang kailangang custom config
      processor = await AutoProcessor.from_pretrained("Xenova/modnet");
    }

    self.postMessage({
      status: "processing",
      message: "Removing background...",
    });

    // Load image
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const image = await RawImage.fromBlob(blob);

    // Preprocess
    const { pixel_values } = await processor(image);

    // Inference: output shape is [1, 1, H, W]
    const { output } = await model({ input: pixel_values });

    // Gamitin ang parehong paraan ng pag-resize ng mask
    const mask = await RawImage.fromTensor(
      output[0].mul(255).to("uint8"),
    ).resize(image.width, image.height);

    // Create canvas and draw the original image
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");

    ctx.drawImage(image.toCanvas(), 0, 0);

    // Apply the mask (alpha channel)
    const pixelData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < mask.data.length; ++i) {
      pixelData.data[4 * i + 3] = mask.data[i]; // Set alpha channel
    }
    ctx.putImageData(pixelData, 0, 0);

    const resultBlob = await canvas.convertToBlob({ type: "image/png" });
    self.postMessage({ status: "success", resultBlob });
  } catch (error: any) {
    console.error("Worker Error:", error);
    self.postMessage({
      status: "error",
      error: error.message || "Unknown error",
    });
  }
};
