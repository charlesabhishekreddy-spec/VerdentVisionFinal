import { useState } from "react";
import { appClient } from "@/api/appClient";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

export default function FeedbackForm({ diagnosis, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [wasCorrect, setWasCorrect] = useState(null);
  const [correctPlant, setCorrectPlant] = useState("");
  const [correctDisease, setCorrectDisease] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (feedbackData) => {
      await appClient.entities.DiagnosisFeedback.create(feedbackData);
    },
    onSuccess: () => {
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    }
  });

  const handleSubmit = () => {
    if (rating === 0) return;

    submitMutation.mutate({
      diagnosis_id: diagnosis.id,
      accuracy_rating: rating,
      was_correct: wasCorrect,
      correct_plant_name: wasCorrect === false ? correctPlant : null,
      correct_disease_name: wasCorrect === false ? correctDisease : null,
      feedback_notes: notes,
      diagnosis_data: {
        plant_name: diagnosis.plant_name,
        disease_name: diagnosis.disease_name,
        confidence_score: diagnosis.confidence_score,
        symptoms: diagnosis.symptoms
      }
    });
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <ThumbsUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-2">Thank You for Your Feedback!</h3>
          <p className="text-sm text-gray-600">
            Your input helps us improve diagnosis accuracy for everyone.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-bold text-gray-900 mb-2">Rate This Diagnosis</h3>
          <p className="text-sm text-gray-600 mb-3">Help us improve our AI accuracy</p>
          
          {/* Star Rating */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Correctness Check */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Was the diagnosis correct?</p>
            <div className="flex gap-3">
              <Button
                variant={wasCorrect === true ? "default" : "outline"}
                onClick={() => setWasCorrect(true)}
                className="flex-1 gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Yes, Correct
              </Button>
              <Button
                variant={wasCorrect === false ? "default" : "outline"}
                onClick={() => setWasCorrect(false)}
                className="flex-1 gap-2"
              >
                <ThumbsDown className="w-4 h-4" />
                No, Incorrect
              </Button>
            </div>
          </div>

          {/* Correction Fields */}
          {wasCorrect === false && (
            <div className="space-y-3 pt-3 border-t">
              <p className="text-sm font-medium text-gray-700">Please provide correct information:</p>
              <Input
                placeholder="Correct plant name"
                value={correctPlant}
                onChange={(e) => setCorrectPlant(e.target.value)}
              />
              <Input
                placeholder="Correct disease name (if any)"
                value={correctDisease}
                onChange={(e) => setCorrectDisease(e.target.value)}
              />
            </div>
          )}

          {/* Additional Notes */}
          <Textarea
            placeholder="Additional feedback or notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-3"
          />

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitMutation.isPending}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}