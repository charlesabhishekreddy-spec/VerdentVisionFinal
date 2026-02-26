import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Bug, AlertCircle, X, Droplets, Sprout, Users } from "lucide-react";
import FeedbackForm from "./FeedbackForm.jsx";

export default function DiagnosisResult({ diagnosis, onStartOver }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const infectionLevel = diagnosis.infection_level || diagnosis.confidence_score || 0;

  const getInfectionColor = (level) => {
    if (level <= 30) return "bg-green-500";
    if (level <= 60) return "bg-yellow-500";
    if (level <= 80) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-stone-50">
          <h2 className="text-xl font-bold text-gray-900">Diagnosis Result</h2>
          {onStartOver && (
            <Button variant="ghost" size="sm" onClick={onStartOver} className="gap-1 text-gray-600">
              <X className="w-4 h-4" />
              Start Over
            </Button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Plant Image */}
          {diagnosis.image_url && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={diagnosis.image_url}
                alt={diagnosis.plant_name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Plant Name */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-600">
              <Leaf className="w-5 h-5 text-green-600" />
              <span className="font-medium">Plant</span>
            </div>
            <p className="text-xl font-bold text-gray-900 ml-7">{diagnosis.plant_name}</p>
          </div>

          {/* Disease Name */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-600">
              <Bug className="w-5 h-5 text-red-600" />
              <span className="font-medium">Disease</span>
            </div>
            <p className="text-xl font-bold text-gray-900 ml-7">
              {diagnosis.disease_name || "No disease detected"}
            </p>
          </div>

          {/* Infection Level */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="font-medium">Infection Level</span>
            </div>
            <div className="ml-7">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getInfectionColor(infectionLevel)} transition-all duration-500`}
                    style={{ width: `${infectionLevel}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-900 w-14 text-right">
                  {infectionLevel}%
                </span>
              </div>
            </div>
          </div>

          {/* Symptoms if available */}
          {diagnosis.symptoms && diagnosis.symptoms.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-600">Detected Symptoms</h4>
              <ul className="ml-7 space-y-1">
                {diagnosis.symptoms.map((symptom, i) => (
                  <li key={i} className="text-gray-700 flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Personalized Care Advice */}
          {diagnosis.careAdvice && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Personalized Care Guide</h3>
              
              {diagnosis.careAdvice.watering && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm">Watering Schedule</span>
                  </div>
                  <p className="text-sm text-gray-700 ml-6">{diagnosis.careAdvice.watering}</p>
                </div>
              )}

              {diagnosis.careAdvice.fertilizer && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Sprout className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-sm">Fertilizer</span>
                  </div>
                  <p className="text-sm text-gray-700 ml-6">{diagnosis.careAdvice.fertilizer}</p>
                </div>
              )}

              {diagnosis.careAdvice.companions && diagnosis.careAdvice.companions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-sm">Good Companions</span>
                  </div>
                  <p className="text-sm text-gray-700 ml-6">{diagnosis.careAdvice.companions.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Feedback Section */}
          <div className="border-t pt-4">
            {!showFeedback ? (
              <Button
                variant="outline"
                onClick={() => setShowFeedback(true)}
                className="w-full"
              >
                Rate This Diagnosis
              </Button>
            ) : (
              <FeedbackForm 
                diagnosis={diagnosis} 
                onSubmitted={() => setShowFeedback(false)} 
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}