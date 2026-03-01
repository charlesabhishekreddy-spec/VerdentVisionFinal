import { useEffect, useRef, useState } from "react";
import { appClient } from "@/api/appClient";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, AlertCircle, Leaf, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DiagnosisResult from "../components/diagnose/DiagnosisResult.jsx";
import TreatmentRecommendations from "../components/diagnose/TreatmentRecommendations.jsx";

const MAX_UPLOAD_MB = 8;
const MIN_RELIABLE_CONFIDENCE = 68;

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const toSeverity = (value) => {
  const normalized = normalizeText(value);
  if (["low", "medium", "high", "critical"].includes(normalized)) return normalized;
  return "medium";
};

const revokeObjectUrl = (url) => {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
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

    const onLoadedMetadata = async () => {
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

    video.srcObject = stream;
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onVideoError);

    return () => {
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onVideoError);
      video.srcObject = null;
    };
  }, [showCamera, stream]);

  const clearSelectedImage = () => {
    revokeObjectUrl(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }
    const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Image is too large. Please upload an image under ${MAX_UPLOAD_MB}MB.`);
      return;
    }

    clearSelectedImage();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setDiagnosisResult(null);
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
    } catch (err) {
      setCameraLoading(false);
      setCameraReady(false);
      setShowCamera(false);
      setError("Unable to access camera. Please check permissions or use file upload.");
      console.error("Camera error:", err);
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
        setError(null);
        setDiagnosisResult(null);
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
    setAnalysisStep("Uploading image");
    setError(null);

    try {
      const { file_url: fileUrl } = await appClient.integrations.Core.UploadFile({ file: selectedFile });

      setAnalysisStep("Loading crop reference data");
      const plantDatabase = await appClient.entities.PlantDatabase.list("", 300);
      const plantNames = plantDatabase
        .slice(0, 140)
        .map((p) => `${p.common_name} (${p.scientific_name})`)
        .join(", ");

      setAnalysisStep("Validating plant presence");
      const plantIdentification = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are VerdentVision Plant Verification Engine.

Your first task is strict validation:
1) Confirm whether this image is a real plant crop image.
2) If image is non-plant, cartoon/anime, UI screenshot, or unrelated object, mark is_plant=false.
3) If confidence is low, abstain and explain the rejection reason.

Reference plant database:
${plantNames}

Return concise, factual output only.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            is_plant: { type: "boolean" },
            rejection_reason: { type: "string" },
            plant_part: {
              type: "string",
              enum: ["leaf", "fruit", "stem", "whole_plant", "unknown"],
            },
            plant_name: { type: "string" },
            scientific_name: { type: "string" },
            plant_family: { type: "string" },
            leaf_description: { type: "string" },
            confidence: { type: "number" },
            identifying_features: { type: "array", items: { type: "string" } },
          },
        },
      });

      const plantConfidence = Math.round(toNumber(plantIdentification?.confidence, 0));
      if (!plantIdentification?.is_plant || plantConfidence < 45) {
        const reason =
          plantIdentification?.rejection_reason ||
          "The image does not appear to be a clear plant/crop photo.";
        setDiagnosisResult(null);
        setError(`${reason} Upload a clear leaf or whole-plant image and try again.`);
        return;
      }

      const identifiedCommon = normalizeText(plantIdentification?.plant_name);
      const identifiedScientific = normalizeText(plantIdentification?.scientific_name);
      const hasCommonMatch = Boolean(identifiedCommon);
      const hasScientificMatch = Boolean(identifiedScientific);
      const plantData = plantDatabase.find((entry) => {
        const common = normalizeText(entry.common_name);
        const scientific = normalizeText(entry.scientific_name);
        return (
          (hasCommonMatch &&
            common &&
            (common === identifiedCommon ||
              common.includes(identifiedCommon) ||
              identifiedCommon.includes(common))) ||
          (hasScientificMatch &&
            scientific &&
            (scientific === identifiedScientific ||
              scientific.includes(identifiedScientific) ||
              identifiedScientific.includes(scientific)))
        );
      });

      const knownDiseases = plantData?.common_diseases?.join(", ") || "No mapped disease list";
      const knownPests = plantData?.common_pests?.join(", ") || "No mapped pest list";

      setAnalysisStep("Analyzing disease patterns");
      const diseaseAnalysis = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are VerdentVision Crop Pathology Engine.
Identified plant: ${plantIdentification.plant_name} (${plantIdentification.scientific_name})
Known issues for this plant:
- Diseases: ${knownDiseases}
- Pests: ${knownPests}

Rules:
1) Use only symptoms visible in the image.
2) If evidence is insufficient, set disease_type="uncertain", confidence below 60, and explain in analysis_notes.
3) If no clear disease is visible, set is_healthy=true and disease_name="Healthy - No Disease Detected".`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            disease_name: { type: "string" },
            disease_type: {
              type: "string",
              enum: ["fungal", "bacterial", "viral", "pest", "nutrient", "physiological", "none", "uncertain"],
            },
            infection_level: { type: "number" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            symptoms: { type: "array", items: { type: "string" } },
            pathogen_signs: { type: "array", items: { type: "string" } },
            is_healthy: { type: "boolean" },
            confidence: { type: "number" },
            analysis_notes: { type: "string" },
          },
        },
      });

      setAnalysisStep("Running reliability verification");
      const verification = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are VerdentVision Diagnosis Verifier.
Plant: ${plantIdentification.plant_name}
Disease hypothesis: ${diseaseAnalysis.disease_name}
Symptoms: ${(diseaseAnalysis.symptoms || []).join(", ")}
Infection level: ${diseaseAnalysis.infection_level}

Return verified=true only when the diagnosis is strongly supported by the image.
If uncertain, set should_abstain=true and provide corrections.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            verified: { type: "boolean" },
            should_abstain: { type: "boolean" },
            final_confidence: { type: "number" },
            reliability_score: { type: "number" },
            corrections: { type: "string" },
          },
        },
      });

      const diseaseConfidence = toNumber(diseaseAnalysis?.confidence, 0);
      const verificationConfidence = toNumber(verification?.final_confidence, 0);
      const finalConfidence = Math.max(
        0,
        Math.min(
          100,
          Math.round(plantConfidence * 0.4 + diseaseConfidence * 0.35 + verificationConfidence * 0.25)
        )
      );

      const isHealthy = Boolean(diseaseAnalysis?.is_healthy);
      const reliable =
        Boolean(verification?.verified) &&
        !Boolean(verification?.should_abstain) &&
        finalConfidence >= MIN_RELIABLE_CONFIDENCE;
      const diseaseName = isHealthy
        ? "Healthy - No Disease Detected"
        : diseaseAnalysis?.disease_name || "Uncertain disease pattern";

      const diagnosis = {
        plant_name: plantIdentification?.plant_name || "Unknown plant",
        disease_name: diseaseName,
        infection_level: Math.max(0, Math.min(100, Math.round(toNumber(diseaseAnalysis?.infection_level, 0)))),
        severity: toSeverity(diseaseAnalysis?.severity),
        confidence_score: finalConfidence,
        symptoms: diseaseAnalysis?.symptoms || [],
        pathogen_signs: diseaseAnalysis?.pathogen_signs || [],
        is_healthy: isHealthy,
        leaf_characteristics: plantIdentification?.leaf_description || "",
        verified: reliable,
        requires_manual_review: !reliable,
        image_url: fileUrl,
        diagnosis_notes: diseaseAnalysis?.analysis_notes || verification?.corrections || "",
        model_corrections: verification?.corrections || "",
        plant_part: plantIdentification?.plant_part || "unknown",
      };

      setAnalysisStep("Saving diagnosis");
      const saved = await appClient.entities.PlantDiagnosis.create({
        plant_name: diagnosis.plant_name,
        disease_name: diagnosis.disease_name,
        severity: diagnosis.severity,
        confidence_score: finalConfidence,
        image_url: fileUrl,
        symptoms: diagnosis.symptoms,
        status: diagnosis.is_healthy ? "monitoring" : reliable ? "diagnosed" : "review_required",
      });

      if (reliable && finalConfidence >= 72 && !diagnosis.is_healthy && diagnosis.disease_name) {
        const existingTreatments = await appClient.entities.Treatment.filter({
          disease_name: diagnosis.disease_name,
        });

        if (existingTreatments.length === 0) {
          try {
            const treatmentResult = await appClient.integrations.Core.InvokeLLM({
              prompt: `Generate treatment recommendations for ${diagnosis.disease_name} on ${diagnosis.plant_name}.

Provide exactly 4 treatments: 2 organic + 2 chemical.
For each treatment include name, type, application_method, description, safety_precautions[], effectiveness_rating(1-5).`,
              response_json_schema: {
                type: "object",
                properties: {
                  treatments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string", enum: ["organic", "chemical"] },
                        description: { type: "string" },
                        application_method: { type: "string" },
                        safety_precautions: { type: "array", items: { type: "string" } },
                        effectiveness_rating: { type: "number" },
                      },
                    },
                  },
                },
              },
            });

            for (const treatment of treatmentResult.treatments || []) {
              await appClient.entities.Treatment.create({
                disease_name: diagnosis.disease_name,
                treatment_name: treatment.name,
                treatment_type: treatment.type,
                description: treatment.description,
                application_method: treatment.application_method,
                safety_precautions: treatment.safety_precautions,
                effectiveness_rating: treatment.effectiveness_rating,
                is_favorite: false,
              });
            }
          } catch (treatmentError) {
            console.error("Failed to auto-generate treatments:", treatmentError);
          }
        }
      }

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
      queryClient.invalidateQueries(["recent-diagnoses"]);

      if (!reliable) {
        setError(
          "Diagnosis confidence is low. Results are shown for review only. Upload a clearer plant image for a verified diagnosis."
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to analyze image. Please try again.");
      console.error(err);
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
                    Use a clear image of an actual plant leaf, stem, fruit, or whole crop. Non-plant images are automatically
                    rejected.
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
                      {analysisStep ? `${analysisStep}...` : "Analyzing image..."}
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
