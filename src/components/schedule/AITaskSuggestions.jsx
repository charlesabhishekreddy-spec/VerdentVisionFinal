import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, X, Loader2, CloudRain, Bug, Sprout } from "lucide-react";

export default function AITaskSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => appClient.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    }
  });

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const user = await appClient.auth.me();
      const location = user?.location || "current location";
      const crops = user?.primary_crops || [];

      // Fetch relevant data
      const [weatherLogs, predictions, cropPlans, existingTasks] = await Promise.all([
        appClient.entities.WeatherLog.list('-date', 7),
        appClient.entities.PestPrediction.filter({ is_active: true }),
        appClient.entities.CropPlan.filter({ status: 'active' }),
        appClient.entities.Task.filter({ status: 'pending' })
      ]);

      // Get real-time weather
      const weatherResult = await appClient.integrations.Core.InvokeLLM({
        prompt: `Get current and 3-day weather forecast for ${location}. Use real-time data.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            current: {
              type: "object",
              properties: {
                temperature: { type: "number" },
                conditions: { type: "string" },
                humidity: { type: "number" }
              }
            },
            forecast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  conditions: { type: "string" },
                  high: { type: "number" },
                  low: { type: "number" },
                  precipitation_chance: { type: "number" }
                }
              }
            }
          }
        }
      });

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are an AI farming task scheduler. Analyze the data and suggest 5-8 specific, actionable tasks for the next 7 days.

USER FARM:
- Location: ${location}
- Crops: ${crops.join(', ') || 'various crops'}

CURRENT WEATHER: ${JSON.stringify(weatherResult.current)}
3-DAY FORECAST: ${JSON.stringify(weatherResult.forecast)}

RECENT WEATHER TRENDS:
${weatherLogs.map(w => `${w.date}: ${w.temperature_high}°F, ${w.humidity}% humidity, ${w.conditions}`).join('\n')}

ACTIVE PEST PREDICTIONS:
${predictions.map(p => `${p.pest_or_disease} - ${p.risk_level} risk for ${p.affected_crops?.join(', ')}`).join('\n')}

ACTIVE CROP PLANS:
${cropPlans.map(p => `${p.crop_name} (${p.growth_stage}) planted ${p.planting_date}`).join('\n')}

EXISTING PENDING TASKS:
${existingTasks.map(t => `${t.title} - ${t.due_date}`).join('\n')}

Generate smart task suggestions:
1. Weather-based tasks (irrigation timing, frost protection, storm prep)
2. Pest prevention based on predictions and weather
3. Crop care based on growth stages
4. Seasonal maintenance tasks
5. Avoid duplicating existing tasks

For each task:
- Title (clear, actionable)
- Type (watering, pest_control, etc.)
- Due date (specific date based on weather/conditions)
- Priority (low/medium/high/urgent)
- Description (why this task is needed now)
- Weather dependent (true/false)
- Crop name if applicable

Be specific about timing based on weather windows.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  task_type: { type: "string" },
                  due_date: { type: "string" },
                  priority: { type: "string" },
                  description: { type: "string" },
                  weather_dependent: { type: "boolean" },
                  crop_name: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateSuggestions();
  }, []);

  const handleAccept = async (suggestion, index) => {
    await createTaskMutation.mutateAsync({
      title: suggestion.title,
      task_type: suggestion.task_type,
      due_date: suggestion.due_date,
      priority: suggestion.priority,
      description: suggestion.description,
      weather_dependent: suggestion.weather_dependent,
      crop_name: suggestion.crop_name,
      status: "pending",
      auto_generated: true,
      suggestion_reason: suggestion.reason
    });
    setDismissedIds([...dismissedIds, index]);
  };

  const handleDismiss = (index) => {
    setDismissedIds([...dismissedIds, index]);
  };

  const getTaskIcon = (type) => {
    if (type.includes('water') || type.includes('irrigation')) return CloudRain;
    if (type.includes('pest')) return Bug;
    return Sprout;
  };

  const visibleSuggestions = suggestions.filter((_, i) => !dismissedIds.includes(i));

  if (isGenerating) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">AI analyzing conditions and generating task suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Task Suggestions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={generateSuggestions}>
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">No new suggestions at this time</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b bg-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Task Suggestions ({visibleSuggestions.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={generateSuggestions} disabled={isGenerating}>
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        {visibleSuggestions.map((suggestion, index) => {
          const Icon = getTaskIcon(suggestion.task_type);
          return (
            <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="w-5 h-5 text-purple-600 mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{suggestion.title}</p>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {new Date(suggestion.due_date).toLocaleDateString()}
                      </Badge>
                      <Badge className={
                        suggestion.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {suggestion.priority}
                      </Badge>
                      {suggestion.weather_dependent && (
                        <Badge className="bg-sky-100 text-sky-800">
                          Weather-dependent
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 italic">💡 {suggestion.reason}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleAccept(suggestion, index)}
                  disabled={createTaskMutation.isPending}
                  className="gap-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Add to Schedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(index)}
                >
                  <X className="w-4 h-4" />
                  Dismiss
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}