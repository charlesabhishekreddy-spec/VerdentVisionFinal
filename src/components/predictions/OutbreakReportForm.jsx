import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, MapPin, Camera, Loader2, AlertTriangle } from "lucide-react";

export default function OutbreakReportForm({ onClose }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    pest_or_disease: "",
    severity: "moderate",
    affected_crops: "",
    location_name: "",
    latitude: null,
    longitude: null,
    description: "",
    image_url: "",
    reporter_name: ""
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));
          
          // Get location name
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `What is the city/region name for coordinates: ${latitude}, ${longitude}? Return just the location name.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: { location_name: { type: "string" } }
            }
          });
          setFormData(prev => ({ ...prev, location_name: result.location_name }));
        },
        () => {}
      );
    }
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({ ...prev, image_url: file_url }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OutbreakReport.create({
      ...data,
      affected_crops: data.affected_crops.split(',').map(c => c.trim()).filter(Boolean),
      verification_count: 0,
      verified: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['outbreak-reports']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const commonPests = [
    "Aphids", "Late Blight", "Early Blight", "Powdery Mildew", "Downy Mildew",
    "Spider Mites", "Whiteflies", "Leaf Spot", "Root Rot", "Fusarium Wilt",
    "Thrips", "Caterpillars", "Beetles", "Rust", "Bacterial Wilt"
  ];

  return (
    <Card className="border-2 border-orange-300 shadow-lg">
      <CardHeader className="border-b bg-orange-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="w-5 h-5" />
            Report Outbreak
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
              <Label>Pest or Disease *</Label>
              <Select
                value={formData.pest_or_disease}
                onValueChange={(v) => setFormData({ ...formData, pest_or_disease: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or type..." />
                </SelectTrigger>
                <SelectContent>
                  {commonPests.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity *</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => setFormData({ ...formData, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">🟢 Mild</SelectItem>
                  <SelectItem value="moderate">🟡 Moderate</SelectItem>
                  <SelectItem value="severe">🟠 Severe</SelectItem>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Affected Crops</Label>
              <Input
                value={formData.affected_crops}
                onChange={(e) => setFormData({ ...formData, affected_crops: e.target.value })}
                placeholder="e.g., Tomatoes, Potatoes"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Input
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                placeholder="Detecting location..."
              />
            </div>

            <div>
              <Label>Your Name</Label>
              <Input
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label>Photo Evidence</Label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full gap-2"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {formData.image_url ? "Change Photo" : "Add Photo"}
              </Button>
              {formData.image_url && (
                <img src={formData.image_url} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />
              )}
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you observed..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={!formData.pest_or_disease || !formData.location_name || createMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Report
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}