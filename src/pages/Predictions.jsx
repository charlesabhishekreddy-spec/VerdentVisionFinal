import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CloudRain, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import PredictionCard from "../components/predictions/PredictionCard.jsx";
import WeatherInput from "../components/predictions/WeatherInput.jsx";
import RiskSummary from "../components/predictions/RiskSummary.jsx";
import WeatherWidget from "../components/predictions/WeatherWidget.jsx";
import WeatherDashboard from "../components/weather/WeatherDashboard.jsx";
import OutbreakReportForm from "../components/predictions/OutbreakReportForm.jsx";
import OutbreakList from "../components/predictions/OutbreakList.jsx";

export default function Predictions() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWeatherInput, setShowWeatherInput] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [currentWeather, setCurrentWeather] = useState(null);
  const queryClient = useQueryClient();

  const { data: predictions = [] } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => appClient.entities.PestPrediction.filter({ is_active: true }, '-created_date'),
  });

  const { data: diagnoses = [] } = useQuery({
    queryKey: ['historical-diagnoses'],
    queryFn: () => appClient.entities.PlantDiagnosis.list('-created_date', 50),
  });

  const { data: weatherLogs = [] } = useQuery({
    queryKey: ['weather-logs'],
    queryFn: () => appClient.entities.WeatherLog.list('-date', 30),
  });

  const { data: outbreakReports = [] } = useQuery({
    queryKey: ['outbreak-reports'],
    queryFn: () => appClient.entities.OutbreakReport.list('-created_date', 20),
  });

  const { data: feedbackData = [] } = useQuery({
    queryKey: ['diagnosis-feedback'],
    queryFn: () => appClient.entities.DiagnosisFeedback.list('-created_date', 100),
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => appClient.entities.PestPrediction.update(id, { user_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['predictions']);
    },
  });

  const generatePredictions = async () => {
    setIsGenerating(true);
    try {
      // Fetch user preferences for personalization
      const user = await appClient.auth.me();
      const userCrops = user?.primary_crops || [];
      const userLocation = user?.location || "Unknown";
      const userFarmingMethod = user?.farming_method || "conventional";
      const userSoilType = user?.soil_type || "unknown";
      
      // Fetch plant database for comprehensive disease analysis
      const plantDatabase = await appClient.entities.PlantDatabase.list('', 300);
      
      const recentWeather = weatherLogs.slice(0, 7);
      const recentDiagnoses = diagnoses.slice(0, 20);

      const historicalPatterns = recentDiagnoses.reduce((acc, d) => {
        const key = d.disease_name;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      // Analyze feedback for common misdiagnoses and patterns
      const incorrectDiagnoses = feedbackData.filter(f => f.was_correct === false);
      const feedbackInsights = incorrectDiagnoses.length > 0 
        ? `\nFEEDBACK INSIGHTS (Common Misdiagnoses):
${incorrectDiagnoses.slice(0, 15).map(f => 
  `- Misidentified "${f.diagnosis_data?.plant_name}" as "${f.correct_plant_name || 'unknown'}"`
).join('\n')}
Average accuracy rating from users: ${(feedbackData.reduce((sum, f) => sum + f.accuracy_rating, 0) / feedbackData.length || 0).toFixed(1)}/5
`
        : '';

      // Build comprehensive plant vulnerability database
      const plantVulnerabilities = plantDatabase.map(p => {
        const tempRange = p.temperature_range || 'unknown';
        const diseases = p.common_diseases?.join(', ') || 'none recorded';
        const pests = p.common_pests?.join(', ') || 'none recorded';
        const soilPH = p.soil_ph || 'unknown';
        const waterNeeds = p.water_requirement || 'unknown';
        
        return `${p.common_name} (${p.scientific_name}):
  - Temp: ${tempRange}, Soil pH: ${soilPH}, Water: ${waterNeeds}
  - Vulnerable to diseases: ${diseases}
  - Vulnerable to pests: ${pests}`;
      }).slice(0, 40).join('\n\n');

      // Include current real-time weather
      const currentWeatherInfo = currentWeather 
        ? `CURRENT REAL-TIME WEATHER:
Location: ${currentWeather.location_name}
Temperature: ${currentWeather.temperature}°F
Humidity: ${currentWeather.humidity}%
Conditions: ${currentWeather.conditions}
Wind: ${currentWeather.wind_speed} mph
Rainfall: ${currentWeather.rainfall || 0}"

` : '';

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are an advanced agricultural disease prediction AI with access to comprehensive plant vulnerability data and user feedback patterns.

USER FARM PROFILE (PRIORITIZE THESE):
Location: ${userLocation}
Primary Crops: ${userCrops.join(', ') || 'Not specified'}
Farming Method: ${userFarmingMethod}
Soil Type: ${userSoilType}

USER'S PAST ISSUES (High Priority):
${recentDiagnoses.map(d => `- ${d.plant_name}: ${d.disease_name} (${d.severity} severity) on ${new Date(d.created_date).toLocaleDateString()}`).join('\n')}

${currentWeatherInfo}RECENT WEATHER DATA (Last 7 days):
${recentWeather.map(w => `Date: ${w.date}, Temp: ${w.temperature_high}°F, Humidity: ${w.humidity}%, Rainfall: ${w.rainfall || 0}"`).join('\n')}

COMMUNITY OUTBREAK REPORTS (Crowd-sourced):
${outbreakReports.slice(0, 10).map(r => `- ${r.pest_or_disease} (${r.severity}) at ${r.location_name}, affecting: ${r.affected_crops?.join(', ') || 'unknown crops'}${r.verified ? ' [VERIFIED]' : ''}`).join('\n')}

COMPREHENSIVE PLANT VULNERABILITY DATABASE:
${plantVulnerabilities}
${feedbackInsights}
HISTORICAL DISEASE PATTERNS:
${Object.entries(historicalPatterns).map(([disease, count]) => `${disease}: ${count} occurrences`).join('\n')}

CURRENT SEASON: ${new Date().toLocaleString('default', { month: 'long' })}

ANALYSIS INSTRUCTIONS (PERSONALIZED):
1. PRIORITIZE the user's specific crops (${userCrops.join(', ')}) - these are most important
2. Look at their past disease history - recurring issues are likely to return
3. Consider their location (${userLocation}) and farming method (${userFarmingMethod})
4. Match current weather conditions against each plant's optimal requirements
5. Identify plants stressed due to suboptimal conditions or soil type mismatch
6. Cross-reference stressed plants with their known disease/pest vulnerabilities
7. Consider user feedback patterns to avoid common misidentification errors
8. Factor in verified community outbreak reports for regional trends

Based on this PERSONALIZED analysis for THIS SPECIFIC FARMER, predict:
1. Potential pest/disease outbreaks in the next 2-4 weeks
2. Risk levels (low, moderate, high, critical)
3. Probability percentages
4. Affected crops
5. Specific preventative measures
6. Expected timeframe

Consider weather patterns, humidity levels, seasonal trends, and historical data. Provide 3-5 predictions.`,
        response_json_schema: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pest_or_disease: { type: "string" },
                  risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                  probability: { type: "number" },
                  affected_crops: { type: "array", items: { type: "string" } },
                  expected_timeframe: { type: "string" },
                  preventative_measures: { type: "array", items: { type: "string" } },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      for (const pred of result.predictions) {
        await appClient.entities.PestPrediction.create({
          pest_or_disease: pred.pest_or_disease,
          risk_level: pred.risk_level,
          probability: pred.probability,
          affected_crops: pred.affected_crops,
          prediction_date: new Date().toISOString().split('T')[0],
          expected_timeframe: pred.expected_timeframe,
          weather_factors: {
            temperature: currentWeather?.temperature || recentWeather[0]?.temperature_high,
            humidity: currentWeather?.humidity || recentWeather[0]?.humidity,
            rainfall: currentWeather?.rainfall || recentWeather[0]?.rainfall || 0,
            conditions: currentWeather?.conditions || recentWeather[0]?.conditions || 'Unknown'
          },
          location: currentWeather?.location_name || recentWeather[0]?.location,
          preventative_measures: pred.preventative_measures,
          is_active: true,
          user_dismissed: false,
          historical_data_used: recentDiagnoses.map(d => d.id)
        });
      }

      queryClient.invalidateQueries(['predictions']);
    } catch (error) {
      console.error("Failed to generate predictions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const activePredictions = predictions.filter(p => !p.user_dismissed);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CloudRain className="w-7 h-7 text-blue-600" />
            Pest & Disease Predictions
          </h2>
          <p className="text-gray-600">AI-powered risk alerts based on weather and historical data</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowReportForm(true)}
            variant="outline"
            className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Outbreak
          </Button>
          <Button
            onClick={() => setShowWeatherInput(true)}
            variant="outline"
            className="gap-2"
          >
            <CloudRain className="w-4 h-4" />
            Log Weather
          </Button>
          <Button
            onClick={generatePredictions}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Generate Predictions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Real-time Weather Dashboard */}
      <WeatherDashboard compact={true} />

      {showReportForm && (
        <OutbreakReportForm onClose={() => setShowReportForm(false)} />
      )}

      {showWeatherInput && (
        <WeatherInput onClose={() => setShowWeatherInput(false)} />
      )}

      <RiskSummary predictions={activePredictions} />

      {activePredictions.length > 0 ? (
        <div className="space-y-4">
          {activePredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onDismiss={() => dismissMutation.mutate(prediction.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Predictions</h3>
            <p className="text-gray-600 mb-4">
              Generate predictions based on your weather data and historical disease patterns
            </p>
            <Button
              onClick={generatePredictions}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? "Analyzing..." : "Generate First Predictions"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Community Outbreak Reports */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-orange-50">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Community Outbreak Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <OutbreakList reports={outbreakReports} />
        </CardContent>
      </Card>

      {/* Recent Weather Summary */}
      {weatherLogs.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-blue-600" />
              Recent Weather Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-4">
              {weatherLogs.slice(0, 7).map((log) => (
                <div key={log.id} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">{new Date(log.date).toLocaleDateString()}</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{log.temperature_high}°F</div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span>💧 {log.humidity}%</span>
                    {log.rainfall > 0 && <span>🌧️ {log.rainfall}"</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}