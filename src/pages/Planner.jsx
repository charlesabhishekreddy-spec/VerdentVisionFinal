import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sprout, Calendar, Droplet } from "lucide-react";

export default function Planner() {
  const [cropName, setCropName] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeline, setTimeline] = useState(null);

  const generateTimeline = async () => {
    if (!cropName || !plantingDate) return;

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a detailed week-by-week crop timeline for ${cropName} starting from ${plantingDate}.

Include:
1. Complete growth phases from seed to harvest
2. Weekly activities and care instructions
3. Watering schedule
4. Fertilization plan
5. Pest prevention tips
6. Expected harvest date
7. Seasonal considerations

Format as a structured timeline with specific weeks and actionable tasks.`,
        response_json_schema: {
          type: "object",
          properties: {
            crop_name: { type: "string" },
            total_weeks: { type: "number" },
            expected_harvest_date: { type: "string" },
            timeline: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  week: { type: "number" },
                  stage: { type: "string" },
                  activities: { type: "array", items: { type: "string" } },
                  tips: { type: "string" }
                }
              }
            },
            watering_schedule: { type: "string" },
            fertilizer_plan: { type: "string" },
            soil_requirements: { type: "string" }
          }
        }
      });

      setTimeline(result);

      await base44.entities.CropPlan.create({
        crop_name: cropName,
        planting_date: plantingDate,
        expected_harvest_date: result.expected_harvest_date,
        timeline: result.timeline,
        water_schedule: result.watering_schedule,
        fertilizer_plan: result.fertilizer_plan,
        soil_requirements: result.soil_requirements,
        status: "active",
        growth_stage: "seed_prep"
      });
    } catch (error) {
      console.error("Failed to generate timeline:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sprout className="w-7 h-7 text-green-600" />
          Crop Timeline Planner
        </h2>
        <p className="text-gray-600">Generate a custom week-by-week plan for your crops</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="crop">Crop Name *</Label>
              <Input
                id="crop"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g., Tomatoes, Corn, Wheat"
              />
            </div>
            <div>
              <Label htmlFor="date">Planting Date *</Label>
              <Input
                id="date"
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={generateTimeline}
            disabled={!cropName || !plantingDate || isGenerating}
            className="w-full bg-green-600 hover:bg-green-700 gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Timeline...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Generate Crop Timeline
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {timeline && (
        <div className="space-y-6">
          {/* Overview */}
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">{timeline.crop_name}</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Duration: {timeline.total_weeks} weeks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sprout className="w-4 h-4" />
                  <span>Harvest: {timeline.expected_harvest_date}</span>
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Watering</h4>
                  </div>
                  <p className="text-sm text-gray-700">{timeline.watering_schedule}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sprout className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900">Fertilizer</h4>
                  </div>
                  <p className="text-sm text-gray-700">{timeline.fertilizer_plan}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <h4 className="font-semibold text-gray-900">Soil</h4>
                  </div>
                  <p className="text-sm text-gray-700">{timeline.soil_requirements}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Timeline */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>Week-by-Week Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {timeline.timeline?.map((week, index) => (
                  <div key={index} className="relative pl-8 pb-6 border-l-2 border-green-200 last:border-0">
                    <div className="absolute left-0 top-0 -translate-x-1/2 bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      {week.week}
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900">Week {week.week}</h4>
                        <span className="text-sm text-gray-600">• {week.stage}</span>
                      </div>
                      <div className="space-y-2 mb-3">
                        {week.activities?.map((activity, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                            <span className="text-sm text-gray-700">{activity}</span>
                          </div>
                        ))}
                      </div>
                      {week.tips && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-900">💡 {week.tips}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}