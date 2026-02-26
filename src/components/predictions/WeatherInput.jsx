import { useState } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, CloudRain, Loader2 } from "lucide-react";

export default function WeatherInput({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: "",
    temperature_high: "",
    temperature_low: "",
    humidity: "",
    rainfall: "",
    conditions: "sunny",
    wind_speed: "",
    notes: ""
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.WeatherLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['weather-logs']);
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      temperature_high: parseFloat(formData.temperature_high),
      temperature_low: parseFloat(formData.temperature_low),
      humidity: parseFloat(formData.humidity),
      rainfall: formData.rainfall ? parseFloat(formData.rainfall) : 0,
      wind_speed: formData.wind_speed ? parseFloat(formData.wind_speed) : 0
    });
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b bg-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-600" />
            Log Weather Data
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="location">Location/Field</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., North Field"
              />
            </div>

            <div>
              <Label htmlFor="temp_high">High Temperature (°F) *</Label>
              <Input
                id="temp_high"
                type="number"
                step="0.1"
                value={formData.temperature_high}
                onChange={(e) => setFormData({ ...formData, temperature_high: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="temp_low">Low Temperature (°F)</Label>
              <Input
                id="temp_low"
                type="number"
                step="0.1"
                value={formData.temperature_low}
                onChange={(e) => setFormData({ ...formData, temperature_low: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="humidity">Humidity (%) *</Label>
              <Input
                id="humidity"
                type="number"
                min="0"
                max="100"
                value={formData.humidity}
                onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="rainfall">Rainfall (inches)</Label>
              <Input
                id="rainfall"
                type="number"
                step="0.01"
                min="0"
                value={formData.rainfall}
                onChange={(e) => setFormData({ ...formData, rainfall: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="conditions">Conditions</Label>
              <Select
                value={formData.conditions}
                onValueChange={(value) => setFormData({ ...formData, conditions: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunny">☀️ Sunny</SelectItem>
                  <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                  <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                  <SelectItem value="stormy">⛈️ Stormy</SelectItem>
                  <SelectItem value="foggy">🌫️ Foggy</SelectItem>
                  <SelectItem value="windy">💨 Windy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="wind">Wind Speed (mph)</Label>
              <Input
                id="wind"
                type="number"
                step="0.1"
                min="0"
                value={formData.wind_speed}
                onChange={(e) => setFormData({ ...formData, wind_speed: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Weather Data"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}