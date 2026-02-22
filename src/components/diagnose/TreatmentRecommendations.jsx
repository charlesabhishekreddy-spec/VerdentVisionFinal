import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Beaker, Leaf, ChevronDown, ChevronUp, RefreshCw, Heart, Star } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function TreatmentRecommendations({ diagnosis }) {
  const [treatments, setTreatments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [savedTreatments, setSavedTreatments] = useState([]);

  const fetchTreatments = async () => {
    setIsLoading(true);
    try {
      // First, check if treatments exist in database
      const existingTreatments = await base44.entities.Treatment.filter({
        disease_name: diagnosis.disease_name
      });

      if (existingTreatments.length > 0) {
        // Use stored treatments
        const formattedTreatments = existingTreatments.map(t => ({
          name: t.treatment_name,
          type: t.treatment_type,
          proportions: t.application_method || "See description",
          description: t.description,
          safety_precautions: t.safety_precautions,
          effectiveness_rating: t.effectiveness_rating,
          id: t.id
        }));
        setTreatments(formattedTreatments);
      } else {
        // Generate new treatments with AI
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert plant pathologist. Provide detailed treatment recommendations for:

Plant: ${diagnosis.plant_name}
Disease: ${diagnosis.disease_name}
Infection Level: ${diagnosis.infection_level || diagnosis.confidence_score}%

Provide exactly 4 treatment options - 2 chemical and 2 organic treatments.
For each treatment provide:
1. Treatment name (include brand examples for chemicals)
2. Type (chemical or organic)
3. Application method and proportions - exact mixing ratios and quantities
4. Description - detailed application instructions, frequency, best timing, and how it works
5. Safety precautions (array)
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
                    type: { type: "string", enum: ["chemical", "organic"] },
                    proportions: { type: "string" },
                    description: { type: "string" },
                    safety_precautions: { type: "array", items: { type: "string" } },
                    effectiveness_rating: { type: "number" }
                  }
                }
              }
            }
          }
        });

        // Auto-save treatments to database
        const savedTreatments = [];
        for (const treatment of result.treatments || []) {
          const saved = await base44.entities.Treatment.create({
            disease_name: diagnosis.disease_name,
            treatment_name: treatment.name,
            treatment_type: treatment.type,
            description: treatment.description,
            application_method: treatment.proportions,
            safety_precautions: treatment.safety_precautions,
            effectiveness_rating: treatment.effectiveness_rating,
            is_favorite: false
          });
          savedTreatments.push({ ...treatment, id: saved.id });
        }

        setTreatments(savedTreatments);
      }
    } catch (error) {
      console.error("Failed to fetch treatments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (diagnosis.disease_name) {
      fetchTreatments();
    }
  }, [diagnosis]);

  const toggleExpand = (index) => {
    setExpandedId(expandedId === index ? null : index);
  };

  const saveToWishlist = async (treatment) => {
    try {
      if (treatment.id) {
        await base44.entities.Treatment.update(treatment.id, { is_favorite: true });
      } else {
        await base44.entities.Treatment.create({
          disease_name: diagnosis.disease_name,
          treatment_name: treatment.name,
          treatment_type: treatment.type,
          description: treatment.description,
          application_method: treatment.proportions,
          safety_precautions: treatment.safety_precautions,
          effectiveness_rating: treatment.effectiveness_rating,
          is_favorite: true
        });
      }
      setSavedTreatments([...savedTreatments, treatment.name]);
    } catch (error) {
      console.error("Failed to save treatment:", error);
    }
  };

  const getTypeIcon = (type) => {
    return type === "chemical" ? Beaker : Leaf;
  };

  const getTypeStyle = (type) => {
    return type === "chemical" 
      ? "text-amber-700" 
      : "text-green-700";
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Generating treatment recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-stone-50">
          <h2 className="text-xl font-bold text-gray-900">Treatment Suggestions</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchTreatments}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refetch Treatments
          </Button>
        </div>

        <div className="divide-y">
          {treatments.map((treatment, index) => {
            const Icon = getTypeIcon(treatment.type);
            const isExpanded = expandedId === index;
            const isSaved = savedTreatments.includes(treatment.name);

            return (
              <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleExpand(index)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${getTypeStyle(treatment.type)}`} />
                      <span className="font-medium text-gray-900">
                        <span className={`${getTypeStyle(treatment.type)} capitalize`}>
                          {treatment.type}:
                        </span>{" "}
                        {treatment.name}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 bg-stone-50">
                    {/* Application Method */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Application Method</h4>
                      <p className="text-gray-700 text-sm">{treatment.proportions}</p>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Description</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{treatment.description}</p>
                    </div>

                    {/* Safety Precautions */}
                    {treatment.safety_precautions && treatment.safety_precautions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Safety Precautions</h4>
                        <ul className="text-gray-700 text-sm space-y-1">
                          {treatment.safety_precautions.map((precaution, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">⚠</span>
                              {precaution}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Effectiveness Rating */}
                    {treatment.effectiveness_rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">Effectiveness:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= treatment.effectiveness_rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save to Wishlist */}
                    {treatment.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveToWishlist(treatment);
                        }}
                        disabled={isSaved}
                        className="gap-2"
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                        {isSaved ? 'Saved to Wishlist' : 'Save to Wishlist'}
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}