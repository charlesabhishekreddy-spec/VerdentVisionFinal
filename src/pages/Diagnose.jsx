import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, Loader2, AlertCircle, Leaf, ShieldCheck } from "lucide-react";
import DiagnosisResult from "../components/diagnose/DiagnosisResult.jsx";
import TreatmentRecommendations from "../components/diagnose/TreatmentRecommendations.jsx";

const MAX_UPLOAD_MB = 8;
const TARGET_UPLOAD_MB = 2.5;
const MAX_IMAGE_DIMENSION = 2048;
const MIN_RELIABLE_CONFIDENCE = 65;
const RETRYABLE_ERROR_CODES = new Set(["ai_timeout", "ai_rate_limited", "upload_failed", "ai_call_failed"]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const revokeObjectUrl = (url) => {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

const extractErrorCode = (error) => {
  const text = String(error?.message || "");
  const match = text.match(/\(([a-z_]+)\)\s*$/i);
  return match ? match[1].toLowerCase() : "";
};

const isLikelyTransientError = (error) => {
  const code = extractErrorCode(error);
  if (RETRYABLE_ERROR_CODES.has(code)) return true;
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("unable to connect") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("rate limit")
  );
};

const normalizePercent = (value, fallback = 0) => {
  let parsed = toNumber(value, fallback);
  if (parsed >= 0 && parsed <= 1) {
    parsed *= 100;
  }
  return Math.round(clamp(parsed, 0, 100));
};

const loadImageForProcessing = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image for optimization."));
    };
    img.src = objectUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to process image canvas."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });

const optimizeImageFile = async (file) => {
  const imageType = String(file?.type || "").toLowerCase();
  const canOptimize = ["image/jpeg", "image/png", "image/webp"].includes(imageType);
  if (!canOptimize) return file;

  const image = await loadImageForProcessing(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  const targetBytes = TARGET_UPLOAD_MB * 1024 * 1024;
  const outputType = imageType === "image/png" ? "image/jpeg" : imageType;
  let quality = 0.9;
  let blob = await canvasToBlob(canvas, outputType, quality);
  while (blob.size > targetBytes && quality > 0.55) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  const shouldKeepOriginal = blob.size >= file.size && scale >= 1;
  if (shouldKeepOriginal) return file;

  const nextExt = outputType.includes("png") ? "png" : outputType.includes("webp") ? "webp" : "jpg";
  const baseName = String(file.name || "plant-image").replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}-optimized.${nextExt}`, {
    type: outputType,
    lastModified: Date.now(),
  });
};

const deriveSeverity = (infectionLevel) => {
  if (infectionLevel <= 20) return "low";
  if (infectionLevel <= 50) return "medium";
  if (infectionLevel <= 80) return "high";
  return "critical";
};

const runWithRetry = async (operation, { maxAttempts = 2, onRetry } = {}) => {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && isLikelyTransientError(error);
      if (!canRetry) throw error;
      if (onRetry) onRetry(attempt, error);
      await sleep(450 * attempt);
    }
  }
  throw lastError || new Error("Operation failed.");
};

export default function Diagnose() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(
    () => () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      revokeObjectUrl(previewUrl);
    },
    [stream, previewUrl]
  );

  useEffect(() => {
    if (!showCamera || !stream || !videoRef.current) return;
    const video = videoRef.current;
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        setCameraLoading(false);
        setError("Camera started but preview did not load. Try again or upload an image.");
      }
    }, 5000);

    const onLoaded = async () => {
      try {
        await video.play();
      } catch (playError) {
        console.error("Camera play error:", playError);
      }
      settled = true;
      setCameraReady(true);
      setCameraLoading(false);
      clearTimeout(timeout);
    };

    const onVideoError = () => {
      if (!settled) {
        setCameraLoading(false);
        setError("Unable to render camera stream. Please use image upload.");
      }
      clearTimeout(timeout);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("error", onVideoError);
    video.srcObject = stream;
    if (video.readyState >= 1) {
      void onLoaded();
    }

    return () => {
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onVideoError);
      video.srcObject = null;
    };
  }, [showCamera, stream]);

  const clearSelectedImage = () => {
    revokeObjectUrl(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`Image is too large. Please upload an image under ${MAX_UPLOAD_MB}MB.`);
      return;
    }

    clearSelectedImage();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDiagnosisResult(null);
    setError(null);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported on this browser/device. Use file upload.");
      return;
    }

    try {
      setCameraLoading(true);
      setCameraReady(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
      setError(null);
    } catch (cameraError) {
      setCameraLoading(false);
      setCameraReady(false);
      setShowCamera(false);
      setError("Unable to access camera. Please check permissions or use file upload.");
      console.error("Camera error:", cameraError);
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraLoading(false);
    setCameraReady(false);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady) {
      setError("Camera preview is not ready yet.");
      return;
    }
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setError("Could not capture image from camera. Try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Unable to process captured image.");
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture image. Please try again.");
          return;
        }
        const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
        clearSelectedImage();
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setDiagnosisResult(null);
        setError(null);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const analyzePlant = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      setAnalysisStep("Optimizing image");
      let fileForUpload = selectedFile;
      try {
        fileForUpload = await optimizeImageFile(selectedFile);
      } catch (optimizeError) {
        console.warn("Image optimization skipped:", optimizeError);
      }

      setAnalysisStep("Uploading image");
      const upload = await runWithRetry(
        async () => appClient.integrations.Core.UploadFile({ file: fileForUpload }),
        {
          maxAttempts: 2,
          onRetry: (attempt) => setAnalysisStep(`Retrying upload (${attempt + 1}/2)`),
        }
      );
      const fileUrl = String(upload?.file_url || "");
      if (!fileUrl || fileUrl.startsWith("blob:")) {
        throw new Error("Image upload failed. Please retry.");
      }

      setAnalysisStep("Running diagnosis engine");
      const result = await runWithRetry(
        async () => appClient.ai.diagnosePlant(fileUrl),
        {
          maxAttempts: 2,
          onRetry: (attempt) => setAnalysisStep(`Retrying diagnosis (${attempt + 1}/2)`),
        }
      );

      const isPlant = result?.is_plant ?? result?.isPlant ?? true;
      if (!isPlant) {
        setDiagnosisResult(null);
        setError(result?.rejection_reason || "This does not appear to be a plant image.");
        return;
      }

      const infectionLevel = normalizePercent(result.infection_level ?? result.infectionLevel, 0);
      const confidenceScore = normalizePercent(result.confidence_score ?? result.confidence, 0);
      const isHealthy = Boolean(result.is_healthy);
      const requiresManualReview =
        Boolean(result.requires_manual_review) || confidenceScore < MIN_RELIABLE_CONFIDENCE;

      let plantDatabase = [];
      setAnalysisStep("Loading plant care references");
      try {
        plantDatabase = await appClient.entities.PlantDatabase.list("", 300);
      } catch (plantDbError) {
        console.warn("Plant database lookup failed:", plantDbError);
      }

      const plantName = normalizeText(result.plant_name);
      const scientificName = normalizeText(result.scientific_name);
      const plantData = (Array.isArray(plantDatabase) ? plantDatabase : []).find((entry) => {
        const common = normalizeText(entry.common_name);
        const scientific = normalizeText(entry.scientific_name);
        return (
          (plantName && (common === plantName || common.includes(plantName) || plantName.includes(common))) ||
          (scientificName &&
            (scientific === scientificName || scientific.includes(scientificName) || scientificName.includes(scientific)))
        );
      });

      const diagnosis = {
        plant_name: result.plant_name || "Unknown plant",
        scientific_name: result.scientific_name || "",
        disease_name: isHealthy ? "Healthy - No Disease Detected" : result.disease_name || "Uncertain disease pattern",
        disease_type: result.disease_type || "uncertain",
        infection_level: isHealthy ? 0 : infectionLevel,
        severity: isHealthy ? "low" : result.severity || deriveSeverity(infectionLevel),
        confidence_score: confidenceScore,
        symptoms: Array.isArray(result.symptoms) ? result.symptoms : [],
        pathogen_signs: Array.isArray(result.pathogen_signs) ? result.pathogen_signs : [],
        is_healthy: isHealthy,
        verified: !requiresManualReview,
        requires_manual_review: requiresManualReview,
        image_url: fileUrl,
        diagnosis_notes: result.diagnosis_notes || "",
        probable_causes: Array.isArray(result.probable_causes) ? result.probable_causes : [],
        immediate_actions: Array.isArray(result.immediate_actions) ? result.immediate_actions : [],
        model_provider: result.model_provider || "",
        model_name: result.model_name || "",
        pipeline_version: result.pipeline_version || "",
      };

      setAnalysisStep("Saving diagnosis");
      const saved = await appClient.entities.PlantDiagnosis.create({
        plant_name: diagnosis.plant_name,
        disease_name: diagnosis.disease_name,
        disease_type: diagnosis.disease_type,
        infection_level: diagnosis.infection_level,
        severity: diagnosis.severity,
        confidence_score: diagnosis.confidence_score,
        requires_manual_review: diagnosis.requires_manual_review,
        model_provider: diagnosis.model_provider,
        model_name: diagnosis.model_name,
        pipeline_version: diagnosis.pipeline_version,
        image_url: diagnosis.image_url,
        symptoms: diagnosis.symptoms,
        status: diagnosis.is_healthy ? "monitoring" : diagnosis.requires_manual_review ? "review_required" : "diagnosed",
      });

      const careAdvice = plantData
        ? {
            watering: plantData.watering_schedule,
            nutrients: plantData.nutrient_needs,
            fertilizer: plantData.fertilizer_schedule,
            companions: plantData.companion_plants,
            avoid: plantData.avoid_planting_with,
          }
        : null;

      setDiagnosisResult({ ...diagnosis, id: saved.id, careAdvice, plantData });
      queryClient.invalidateQueries({ queryKey: ["recent-diagnoses"] });

      if (diagnosis.requires_manual_review) {
        setError("Diagnosis confidence is low. Results are shown for review only.");
      }
    } catch (diagnosisError) {
      const code = extractErrorCode(diagnosisError);
      if (code === "ai_not_configured") {
        setError("Diagnosis AI provider is not configured on server. Set GEMINI_API_KEY or OPENAI_API_KEY.");
      } else if (code === "ai_rate_limited") {
        setError("Diagnosis request is rate limited. Please wait a moment and try again.");
      } else if (code === "ai_timeout") {
        setError("Diagnosis timed out. Please retry with a clear single-leaf or whole-plant image.");
      } else if (code === "upload_failed") {
        setError("Image upload failed. Please retry with a smaller image.");
      } else {
        setError(diagnosisError?.message || "Failed to diagnose image. Please try again.");
      }
      console.error(diagnosisError);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-violet-100/80 via-white/70 to-teal-50/80 p-4 shadow-[0_20px_60px_rgba(76,29,149,0.12)] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-16 top-[-60px] h-48 w-48 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-[-80px] h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified Diagnosis Workflow
        </div>
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">AI Plant Diagnosis</h2>
        <p className="text-gray-700">
          Upload a real crop image to run plant validation, disease analysis, and confidence verification.
        </p>
      </div>

      {!diagnosisResult && (
        <Card className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/70 shadow-xl backdrop-blur-md">
          <CardContent className="p-0">
            {showCamera ? (
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="h-[320px] w-full object-cover bg-black sm:h-[420px]" />

                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting camera...
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 left-0 right-0 flex flex-wrap justify-center gap-3 px-4">
                  <Button
                    onClick={capturePhoto}
                    className="gap-2 bg-violet-600 hover:bg-violet-700"
                    size="lg"
                    disabled={!cameraReady}
                  >
                    <Camera className="h-5 w-5" />
                    Capture Photo
                  </Button>
                  <Button onClick={stopCamera} variant="secondary" size="lg">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Selected for diagnosis" className="h-[320px] w-full object-cover sm:h-[420px]" />
                <Button
                  onClick={clearSelectedImage}
                  variant="secondary"
                  size="sm"
                  className="absolute right-4 top-4 border border-white/70 bg-white/80"
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <div className="p-5 sm:p-8">
                <div className="rounded-3xl border border-dashed border-violet-300/80 bg-gradient-to-br from-violet-50/80 via-white/90 to-cyan-50/70 p-8 text-center sm:p-12">
                  <div className="mb-6 flex justify-center">
                    <div className="rounded-3xl border border-violet-200/80 bg-white/90 p-4 shadow-sm">
                      <Leaf className="h-12 w-12 text-violet-600" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">Capture or Upload Plant Image</h3>
                  <p className="mx-auto mb-6 max-w-xl text-gray-700">
                    Use a clear image of an actual plant leaf, stem, fruit, or whole crop. Non-plant images are rejected.
                  </p>
                  <div className="flex flex-col justify-center gap-4 sm:flex-row">
                    <Button onClick={startCamera} className="gap-2 bg-violet-600 hover:bg-violet-700" size="lg">
                      <Camera className="h-5 w-5" />
                      Take Photo
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                      size="lg"
                    >
                      <Upload className="h-5 w-5" />
                      Upload Image
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {previewUrl && (
              <div className="border-t border-violet-100 bg-white/70 p-4 sm:p-6">
                <Button
                  onClick={analyzePlant}
                  disabled={isAnalyzing}
                  className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {analysisStep ? `${analysisStep}...` : "Diagnosing image..."}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5" />
                      Run Verified Diagnosis
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {diagnosisResult && (
        <div className="grid gap-6 xl:grid-cols-2">
          <DiagnosisResult
            diagnosis={diagnosisResult}
            onStartOver={() => {
              setDiagnosisResult(null);
              clearSelectedImage();
              stopCamera();
              setError(null);
            }}
          />
          <TreatmentRecommendations diagnosis={diagnosisResult} />
        </div>
      )}
    </div>
  );
}
