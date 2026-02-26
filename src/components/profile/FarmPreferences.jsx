import { useState } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, Loader2 } from "lucide-react";

export default function FarmPreferences({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    farm_name: user?.farm_name || "",
    location: user?.location || "",
    farm_size: user?.farm_size || "",
    primary_crops: user?.primary_crops?.join(", ") || "",
    farming_method: user?.farming_method || "conventional",
    soil_type: user?.soil_type || "",
    climate_zone: user?.climate_zone || "",
    years_experience: user?.years_experience || 0,
    notifications_enabled: user?.notifications_enabled !== false
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = {
        ...data,
        primary_crops: data.primary_crops.split(",").map(c => c.trim()).filter(Boolean)
      };
      await appClient.auth.updateMe(updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setIsEditing(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!isEditing) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-blue-600" />
              Farm Preferences
            </CardTitle>
            <Button onClick={() => setIsEditing(true)} size="sm">
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Farm Name</p>
              <p className="font-semibold text-gray-900">{user?.farm_name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-semibold text-gray-900">{user?.location || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Farm Size</p>
              <p className="font-semibold text-gray-900">{user?.farm_size || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Farming Method</p>
              <p className="font-semibold text-gray-900 capitalize">{user?.farming_method || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Primary Crops</p>
              <p className="font-semibold text-gray-900">{user?.primary_crops?.join(", ") || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Soil Type</p>
              <p className="font-semibold text-gray-900">{user?.soil_type || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Climate Zone</p>
              <p className="font-semibold text-gray-900">{user?.climate_zone || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Years Experience</p>
              <p className="font-semibold text-gray-900">{user?.years_experience || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b bg-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-blue-600" />
          Edit Farm Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Farm Name</Label>
              <Input
                value={formData.farm_name}
                onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                placeholder="Green Valley Farm"
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="California, USA"
              />
            </div>

            <div className="space-y-2">
              <Label>Farm Size</Label>
              <Input
                value={formData.farm_size}
                onChange={(e) => setFormData({ ...formData, farm_size: e.target.value })}
                placeholder="5 acres"
              />
            </div>

            <div className="space-y-2">
              <Label>Farming Method</Label>
              <Select
                value={formData.farming_method}
                onValueChange={(value) => setFormData({ ...formData, farming_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic">Organic</SelectItem>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Primary Crops (comma-separated)</Label>
              <Input
                value={formData.primary_crops}
                onChange={(e) => setFormData({ ...formData, primary_crops: e.target.value })}
                placeholder="Tomatoes, Lettuce, Corn"
              />
            </div>

            <div className="space-y-2">
              <Label>Soil Type</Label>
              <Input
                value={formData.soil_type}
                onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                placeholder="Loamy, Clay, Sandy"
              />
            </div>

            <div className="space-y-2">
              <Label>Climate Zone</Label>
              <Input
                value={formData.climate_zone}
                onChange={(e) => setFormData({ ...formData, climate_zone: e.target.value })}
                placeholder="USDA Zone 9b"
              />
            </div>

            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input
                type="number"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                placeholder="5"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}