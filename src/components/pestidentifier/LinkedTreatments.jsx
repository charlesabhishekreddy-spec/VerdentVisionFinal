import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Beaker, Leaf, Heart, Star, RefreshCw, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function LinkedTreatments({ pestOrDisease }) {
  const [expandedId, setExpandedId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: treatments = [], isLoading } = useQuery({
    queryKey: ['treatments', pestOrDisease],
    queryFn: () => base44.entities.Treatment.filter({ disease_name: pestOrDisease }),
    enabled: !!pestOrDisease
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) =>
      base44.entities.Treatment.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries(['treatments', pestOrDisease]);
    }
  });

  const generateTreatments = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate treatment recommendations for: ${pestOrDisease}

Provide exactly 4 treatment options - 2 organic and 2 chemical treatments.

For each treatment provide:
1. Treatment name (include brand examples for chemicals)
2. Type (organic or chemical)
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
                  type: { type: "string", enum: ["organic", "chemical"] },
                  application_method: { type: "string" },
                  description: { type: "string" },
                  safety_precautions: { type: "array", items: { type: "string" } },
                  effectiveness_rating: { type: "number" }
                }
              }
            }
          }
        }
      });

      for (const treatment of result.treatments || []) {
        await base44.entities.Treatment.create({
          disease_name: pestOrDisease,
          treatment_name: treatment.name,
          treatment_type: treatment.type,
          description: treatment.description,
          application_method: treatment.application_method,
          safety_precautions: treatment.safety_precautions,
          effectiveness_rating: treatment.effectiveness_rating,
          is_favorite: false
        });
      }

      queryClient.invalidateQueries(['treatments', pestOrDisease]);
    } catch (error) {
      console.error("Failed to generate treatments:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTypeIcon = (type) => {
    return type === "chemical" ? Beaker : Leaf;
  };

  const getTypeStyle = (type) => {
    return type === "chemical" ? "text-amber-700" : "text-green-700";
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading treatments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-stone-50">
          <h2 className="text-xl font-bold text-gray-900">Available Treatments</h2>
          {treatments.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={generateTreatments} disabled={isGenerating} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
          ) : (
            <Button size="sm" onClick={generateTreatments} disabled={isGenerating} className="gap-2 bg-orange-600 hover:bg-orange-700">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          )}
        </div>

        {treatments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Beaker className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-gray-600 mb-4">No treatments found for this pest/disease</p>
            <Button onClick={generateTreatments} disabled={isGenerating} className="bg-orange-600 hover:bg-orange-700">
              {isGenerating ? "Generating Treatments..." : "Generate AI Treatments"}
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {treatments.map((treatment, index) => {
              const Icon = getTypeIcon(treatment.treatment_type);
              const isExpanded = expandedId === index;

              return (
                <Collapsible key={treatment.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : index)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${getTypeStyle(treatment.treatment_type)}`} />
                        <span className="font-medium text-gray-900">
                          <span className={`${getTypeStyle(treatment.treatment_type)} capitalize`}>
                            {treatment.treatment_type}:
                          </span>{" "}
                          {treatment.treatment_name}
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
                      {treatment.application_method && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Application Method</h4>
                          <p className="text-gray-700 text-sm">{treatment.application_method}</p>
                        </div>
                      )}

                      {/* Description */}
                      {treatment.description && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Description</h4>
                          <p className="text-gray-700 text-sm leading-relaxed">{treatment.description}</p>
                        </div>
                      )}

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

                      {/* Favorite Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          favoriteMutation.mutate({
                            id: treatment.id,
                            isFavorite: treatment.is_favorite
                          });
                        }}
                        className="gap-2"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            treatment.is_favorite ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                        {treatment.is_favorite ? "Favorited" : "Add to Favorites"}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}