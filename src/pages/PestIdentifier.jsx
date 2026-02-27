import { useState, useRef } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Bug, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PestResult from "../components/pestidentifier/PestResult.jsx";
import LinkedTreatments from "../components/pestidentifier/LinkedTreatments.jsx";

export default function PestIdentifier() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [identificationResult, setIdentificationResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setIdentificationResult(null);
    }
  };

  const identifyPest = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file: selectedFile });

      // Fetch plant database to cross-reference common pests/diseases
      const plantDatabase = await appClient.entities.PlantDatabase.list('', 300);
      const allPests = [...new Set(plantDatabase.flatMap(p => p.common_pests || []))];
      const allDiseases = [...new Set(plantDatabase.flatMap(p => p.common_diseases || []))];

      // AI Analysis
      const analysis = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are an expert entomologist and plant pathologist. Analyze this image to identify any pest or disease present.

KNOWN PESTS DATABASE: ${allPests.slice(0, 50).join(', ')}
KNOWN DISEASES DATABASE: ${allDiseases.slice(0, 50).join(', ')}

Perform detailed identification:

1. VISUAL ANALYSIS:
   - Identify the organism or pathogen present
   - Note distinctive features (color, shape, size, markings)
   - Observe damage patterns or symptoms visible
   - Check for any life stage indicators (larva, adult, spores, etc.)

2. CLASSIFICATION:
   - Common name and scientific name
   - Type: insect pest, disease (fungal/bacterial/viral), mite, or other
   - Severity level based on visible damage
   - Host plants commonly affected

3. BEHAVIOR & LIFECYCLE:
   - Feeding patterns or infection methods
   - Life cycle stage visible
   - Seasonal activity patterns
   - Reproductive habits

4. DAMAGE ASSESSMENT:
   - Type of damage caused (chewing, sucking, boring, spotting, wilting)
   - Economic impact level
   - Speed of spread
   - Typical damage timeline

5. IDENTIFICATION CONFIDENCE:
   - Confidence score (0-100)
   - Key identifying features used
   - Alternative possibilities if confidence is low

Provide comprehensive identification with actionable details.`,
        file_urls: [file_url],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            pest_or_disease_name: { type: "string" },
            scientific_name: { type: "string" },
            type: { 
              type: "string", 
              enum: ["insect_pest", "fungal_disease", "bacterial_disease", "viral_disease", "mite", "nematode", "other"]
            },
            severity: { 
              type: "string", 
              enum: ["low", "moderate", "high", "critical"]
            },
            confidence_score: { type: "number" },
            key_features: { type: "array", items: { type: "string" } },
            damage_description: { type: "string" },
            lifecycle_stage: { type: "string" },
            affected_plants: { type: "array", items: { type: "string" } },
            spread_rate: { type: "string" },
            seasonal_activity: { type: "string" },
            economic_impact: { type: "string" }
          }
        }
      });

      const result = {
        ...analysis,
        image_url: file_url
      };

      setIdentificationResult(result);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pest & Disease Identifier</h2>
        <p className="text-gray-600">Upload an image of a pest or disease for instant AI identification</p>
      </div>

      {/* Upload Section */}
      {!identificationResult && (
        <Card className="border-none shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {previewUrl ? (
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
                      <Bug className="w-12 h-12 text-violet-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Capture or Upload Pest/Disease Image
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Get instant AI-powered identification and treatment suggestions
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={() => cameraInputRef.current?.click()}
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
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
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
                  onClick={identifyPest}
                  disabled={isAnalyzing}
                  className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI Analysis in Progress...
                    </>
                  ) : (
                    <>
                      <Bug className="w-5 h-5" />
                      Identify Pest/Disease
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

      {/* Identification Result */}
      {identificationResult && (
        <div className="grid md:grid-cols-2 gap-6">
          <PestResult 
            result={identificationResult} 
            onStartOver={() => {
              setIdentificationResult(null);
              setPreviewUrl(null);
              setSelectedFile(null);
            }}
          />
          <LinkedTreatments pestOrDisease={identificationResult.pest_or_disease_name} />
        </div>
      )}
    </div>
  );
}
