import { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Leaf, Beaker, Heart, Star, Shield } from "lucide-react";

export default function Treatments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const queryClient = useQueryClient();

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => appClient.entities.Treatment.list('-effectiveness_rating'),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => 
      appClient.entities.Treatment.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries(['treatments']);
    },
  });

  const filteredTreatments = treatments.filter(t => {
    const matchesSearch = t.disease_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.treatment_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || t.treatment_type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type) => {
    const icons = {
      organic: Leaf,
      chemical: Beaker,
      biological: Heart,
      cultural: Shield
    };
    return icons[type] || Leaf;
  };

  const getTypeColor = (type) => {
    const colors = {
      organic: "bg-green-100 text-green-800",
      chemical: "bg-orange-100 text-orange-800",
      biological: "bg-purple-100 text-purple-800",
      cultural: "bg-blue-100 text-blue-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Beaker className="w-7 h-7 text-violet-600" />
          Treatment Library
        </h2>
        <p className="text-gray-600">Browse proven treatments for common plant diseases</p>
      </div>

      {/* Search and Filter */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by disease or treatment name..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'organic', 'chemical', 'biological'].map(type => (
                <Button
                  key={type}
                  onClick={() => setFilterType(type)}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  className={filterType === type ? "bg-violet-600 hover:bg-violet-700" : ""}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treatments Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredTreatments.map((treatment) => {
          const Icon = getTypeIcon(treatment.treatment_type);
          return (
            <Card key={treatment.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTypeColor(treatment.treatment_type)}>
                        <Icon className="w-3 h-3 mr-1" />
                        {treatment.treatment_type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavoriteMutation.mutate({ 
                          id: treatment.id, 
                          isFavorite: treatment.is_favorite 
                        })}
                        className="ml-auto"
                      >
                        <Star className={`w-5 h-5 ${
                          treatment.is_favorite 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-400'
                        }`} />
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{treatment.treatment_name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">For: {treatment.disease_name}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-gray-700">{treatment.description}</p>

                {/* Effectiveness Rating */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Effectiveness:</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < treatment.effectiveness_rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Ingredients */}
                {treatment.ingredients && treatment.ingredients.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Ingredients:</h4>
                    <div className="space-y-1">
                      {treatment.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1">
                          <span className="text-gray-700">{ing.name}</span>
                          <span className="text-gray-600 font-medium">
                            {ing.quantity} {ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application */}
                <div className="rounded-lg border border-violet-200/80 bg-violet-50/70 p-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Application:</h4>
                  <p className="text-sm text-gray-700">{treatment.application_method}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Frequency:</strong> {treatment.frequency}
                  </p>
                </div>

                {/* Safety */}
                {treatment.safety_precautions && treatment.safety_precautions.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Safety Precautions:
                    </h4>
                    <ul className="space-y-1">
                      {treatment.safety_precautions.map((precaution, i) => (
                        <li key={i} className="text-xs text-red-800 flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          {precaution}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTreatments.length === 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No treatments found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
