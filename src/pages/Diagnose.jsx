import { useState, useRef } from "react";
import { appClient } from "@/api/appClient";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, AlertCircle, Leaf } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DiagnosisResult from "../components/diagnose/DiagnosisResult.jsx";
import TreatmentRecommendations from "../components/diagnose/TreatmentRecommendations.jsx";

export default function Diagnose() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setDiagnosisResult(null);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setStream(mediaStream);
      setShowCamera(true);
      setError(null);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      setError("Unable to access camera. Please check permissions or use file upload.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        stopCamera();
      }, 'image/jpeg', 0.9);
    }
  };

  const analyzePlant = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file: selectedFile });

      // Fetch plant database for reference
      const plantDatabase = await appClient.entities.PlantDatabase.list('', 300);
      const plantNames = plantDatabase.map(p => `${p.common_name} (${p.scientific_name})`).join(', ');

      // STEP 1: Plant Identification (Deep Analysis)
      const plantIdentification = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are a master botanist specializing in plant taxonomy and morphology. Analyze this leaf image and identify the plant species with EXTREME precision.

PLANT DATABASE REFERENCE:
Available plants in our database: ${plantNames}

Try to match the plant to one from our database for accurate diagnosis.

DETAILED LEAF ANALYSIS:
1. Leaf Shape: Describe the overall outline (linear, lanceolate, ovate, elliptic, obovate, cordate, orbicular, reniform, etc.)
2. Leaf Margin: Analyze edges (entire/smooth, serrate, dentate, crenate, lobed, undulate, etc.)
3. Venation Pattern: Study vein arrangement (pinnate, palmate, parallel, reticulate, arcuate)
4. Leaf Apex: Tip shape (acute, acuminate, obtuse, truncate, emarginate, mucronate)
5. Leaf Base: Base shape (cuneate, rounded, cordate, truncate, oblique)
6. Surface Texture: Observe texture (glabrous/smooth, pubescent/hairy, waxy, glossy, rough)
7. Color & Thickness: Note color variations and leaf thickness indicators
8. Size & Proportions: Estimate length-to-width ratio

CROSS-REFERENCE DATABASE:
Compare with these common agricultural plants:
- Solanaceae family: Potato (compound pinnate), Tomato (pinnate, serrated), Pepper (simple ovate), Eggplant (ovate-elliptic)
- Cucurbitaceae: Cucumber (palmate-lobed), Squash (large palmate), Melon (cordate base)
- Fabaceae: Beans (trifoliate compound), Peas (pinnate with tendrils)
- Brassicaceae: Cabbage (waxy glaucous), Lettuce (rosette form)
- Rosaceae: Strawberry (trifoliate serrated), Apple (ovate serrate)

IDENTIFY WITH 100% CONFIDENCE - Never say "unknown". Use morphological clues to determine the most likely species.`,
        file_urls: [file_url],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            plant_name: { type: "string" },
            scientific_name: { type: "string" },
            plant_family: { type: "string" },
            leaf_description: { type: "string" },
            confidence: { type: "number" },
            identifying_features: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Get plant-specific data from database
      const plantData = plantDatabase.find(p => 
        p.common_name.toLowerCase() === plantIdentification.plant_name.toLowerCase() ||
        p.scientific_name.toLowerCase() === plantIdentification.scientific_name.toLowerCase()
      );

      const knownDiseases = plantData?.common_diseases?.join(', ') || 'general diseases';
      const knownPests = plantData?.common_pests?.join(', ') || 'general pests';

      // STEP 2: Disease Detection (Pathology Analysis)
      const diseaseAnalysis = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are an expert plant pathologist. The plant has been identified as: ${plantIdentification.plant_name} (${plantIdentification.scientific_name}).

KNOWN DISEASES FOR THIS PLANT: ${knownDiseases}
KNOWN PESTS FOR THIS PLANT: ${knownPests}

Focus on these common issues while performing diagnosis.

Perform a COMPREHENSIVE disease diagnosis:

VISUAL SYMPTOM ANALYSIS:
1. Lesion Characteristics:
   - Color: brown, black, yellow, white, purple, gray
   - Shape: circular, irregular, angular, elongated
   - Size: pinpoint, small (<5mm), medium (5-10mm), large (>10mm)
   - Pattern: scattered, clustered, concentric rings, target spots
   - Margins: defined, diffuse, water-soaked, chlorotic halos

2. Leaf Discoloration:
   - Chlorosis: interveinal, marginal, uniform
   - Necrosis: spotty, tip burn, edge scorch
   - Other: bronzing, purpling, mottling

3. Pathogen Signs:
   - Fungal: spores, mycelium, fruiting bodies, powdery coating, rust pustules
   - Bacterial: ooze, water-soaking, soft rot
   - Viral: mosaic patterns, ring spots, vein clearing, stunting

4. Disease Progression:
   - Early stage: small spots, initial symptoms
   - Mid stage: expanding lesions, multiple sites
   - Advanced: coalescing spots, severe necrosis

DISEASE MATCHING FOR ${plantIdentification.plant_name}:
Match symptoms to known diseases of this plant. Be SPECIFIC with disease name (e.g., "Phytophthora infestans - Late Blight" not just "Blight").

Calculate precise infection percentage based on visible leaf area affected.`,
        file_urls: [file_url],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            disease_name: { type: "string" },
            disease_type: { type: "string" },
            infection_level: { type: "number" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            symptoms: { type: "array", items: { type: "string" } },
            pathogen_signs: { type: "array", items: { type: "string" } },
            is_healthy: { type: "boolean" },
            confidence: { type: "number" }
          }
        }
      });

      // STEP 3: Cross-Verification
      const verification = await appClient.integrations.Core.InvokeLLM({
        prompt: `FINAL VERIFICATION:
Plant: ${plantIdentification.plant_name}
Disease: ${diseaseAnalysis.disease_name}

Verify this diagnosis is correct. Check if the disease commonly affects this plant species. Cross-reference symptom match. Provide final confidence score (0-100).

Is this diagnosis accurate? If not, provide corrected identification.`,
        file_urls: [file_url],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            verified: { type: "boolean" },
            final_confidence: { type: "number" },
            corrections: { type: "string" },
            reliability_score: { type: "number" }
          }
        }
      });

      // Combine results
      const finalConfidence = Math.round(
        (plantIdentification.confidence + diseaseAnalysis.confidence + verification.final_confidence) / 3
      );

      const diagnosis = {
        plant_name: plantIdentification.plant_name,
        disease_name: diseaseAnalysis.disease_name || "Healthy - No Disease Detected",
        infection_level: diseaseAnalysis.infection_level || 0,
        severity: diseaseAnalysis.severity || "low",
        confidence_score: finalConfidence,
        symptoms: diseaseAnalysis.symptoms || [],
        is_healthy: diseaseAnalysis.is_healthy,
        leaf_characteristics: plantIdentification.leaf_description,
        verified: verification.verified,
        image_url: file_url
      };

      const saved = await appClient.entities.PlantDiagnosis.create({
        plant_name: diagnosis.plant_name,
        disease_name: diagnosis.disease_name,
        severity: diagnosis.severity,
        confidence_score: finalConfidence,
        image_url: file_url,
        symptoms: diagnosis.symptoms,
        status: diagnosis.is_healthy ? "monitoring" : "diagnosed"
      });

      // Auto-generate treatments for high-confidence diagnoses
      if (finalConfidence >= 70 && !diagnosis.is_healthy) {
        const existingTreatments = await appClient.entities.Treatment.filter({
          disease_name: diagnosis.disease_name
        });

        if (existingTreatments.length === 0) {
          try {
            const treatmentResult = await appClient.integrations.Core.InvokeLLM({
              prompt: `Generate treatment recommendations for ${diagnosis.disease_name} on ${diagnosis.plant_name}.

Provide exactly 4 treatments - 2 organic and 2 chemical:

For each treatment:
1. Name (include brand examples for chemicals)
2. Type (organic or chemical)
3. Application method and frequency
4. Ingredients/active compounds with proportions
5. Safety precautions
6. Effectiveness rating (1-5)

Be specific and practical.`,
              response_json_schema: {
                type: "object",
                properties: {
                  treatments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                        description: { type: "string" },
                        application_method: { type: "string" },
                        ingredients: { type: "string" },
                        safety_precautions: { type: "array", items: { type: "string" } },
                        effectiveness_rating: { type: "number" }
                      }
                    }
                  }
                }
              }
            });

            for (const treatment of treatmentResult.treatments) {
              await appClient.entities.Treatment.create({
                disease_name: diagnosis.disease_name,
                treatment_name: treatment.name,
                treatment_type: treatment.type,
                description: treatment.description,
                application_method: treatment.application_method,
                safety_precautions: treatment.safety_precautions,
                effectiveness_rating: treatment.effectiveness_rating,
                is_favorite: false
              });
            }
          } catch (error) {
            console.error("Failed to auto-generate treatments:", error);
          }
        }
      }

      // Add plant care advice if available from database
      const careAdvice = plantData ? {
        watering: plantData.watering_schedule,
        nutrients: plantData.nutrient_needs,
        fertilizer: plantData.fertilizer_schedule,
        companions: plantData.companion_plants,
        avoid: plantData.avoid_planting_with
      } : null;

      setDiagnosisResult({ ...diagnosis, id: saved.id, careAdvice, plantData });
      queryClient.invalidateQueries(['recent-diagnoses']);
    } catch (err) {
      setError("Failed to analyze image. Please try again.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Plant Diagnosis</h2>
        <p className="text-gray-600">Upload a photo of your crop for instant AI analysis</p>
      </div>

      {/* Upload Section */}
      {!diagnosisResult && (
        <Card className="border-none shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {showCamera ? (
              <div className="relative">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  className="w-full h-80 object-cover bg-black"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <Button
                    onClick={capturePhoto}
                    className="bg-violet-600 hover:bg-violet-700 gap-2"
                    size="lg"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Photo
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="secondary"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-80 object-cover"
                />
                <Button
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                  }}
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4"
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <div className="p-8">
                <div className="rounded-2xl border-2 border-dashed border-violet-200 p-12 text-center bg-violet-50/60">
                  <div className="flex justify-center gap-4 mb-6">
                    <div className="bg-white p-4 rounded-2xl shadow-md">
                      <Leaf className="w-12 h-12 text-violet-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Capture or Upload Plant Image
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Get instant AI-powered diagnosis and treatment recommendations
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={startCamera}
                      className="bg-violet-600 hover:bg-violet-700 gap-2"
                      size="lg"
                    >
                      <Camera className="w-5 h-5" />
                      Take Photo
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                      size="lg"
                    >
                      <Upload className="w-5 h-5" />
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
              <div className="p-6 border-t">
                <Button
                  onClick={analyzePlant}
                  disabled={isAnalyzing}
                  className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Multi-Step AI Analysis in Progress...
                    </>
                  ) : (
                    <>
                      <Leaf className="w-5 h-5" />
                      Advanced AI Diagnosis
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

      {/* Diagnosis Result */}
      {diagnosisResult && (
        <div className="grid md:grid-cols-2 gap-6">
          <DiagnosisResult 
            diagnosis={diagnosisResult} 
            onStartOver={() => {
              setDiagnosisResult(null);
              setPreviewUrl(null);
              setSelectedFile(null);
            }}
          />
          <TreatmentRecommendations diagnosis={diagnosisResult} />
        </div>
      )}
    </div>
  );
}
