import React from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Beaker, Leaf, Heart, Star } from "lucide-react";

export default function TreatmentHistory() {
  const queryClient = useQueryClient();

  const { data: treatments = [] } = useQuery({
    queryKey: ['user-treatments'],
    queryFn: () => appClient.entities.Treatment.list('-created_date'),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) =>
      appClient.entities.Treatment.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-treatments']);
    }
  });

  const getTypeColor = (type) => {
    const colors = {
      organic: "bg-green-100 text-green-800",
      chemical: "bg-amber-100 text-amber-800",
      biological: "bg-blue-100 text-blue-800",
      cultural: "bg-purple-100 text-purple-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getTypeIcon = (type) => {
    return type === "chemical" ? Beaker : Leaf;
  };

  if (treatments.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-blue-600" />
            Saved Treatments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Beaker className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-gray-600">No saved treatments yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-blue-600" />
          Saved Treatments ({treatments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {treatments.map((treatment) => {
            const Icon = getTypeIcon(treatment.treatment_type);
            return (
              <div key={treatment.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{treatment.treatment_name}</p>
                      <p className="text-sm text-gray-600">For: {treatment.disease_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {treatment.effectiveness_rating && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= treatment.effectiveness_rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleFavoriteMutation.mutate({
                          id: treatment.id,
                          isFavorite: treatment.is_favorite
                        })
                      }
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          treatment.is_favorite
                            ? "fill-red-500 text-red-500"
                            : "text-gray-400"
                        }`}
                      />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <Badge className={getTypeColor(treatment.treatment_type)}>
                    {treatment.treatment_type}
                  </Badge>
                </div>

                {treatment.description && (
                  <p className="text-sm text-gray-700 mb-2">{treatment.description}</p>
                )}

                {treatment.application_method && (
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold">Application:</span> {treatment.application_method}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}