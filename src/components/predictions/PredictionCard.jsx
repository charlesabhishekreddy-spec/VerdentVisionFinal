import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, X, Shield, Leaf, Calendar } from "lucide-react";

export default function PredictionCard({ prediction, onDismiss }) {
  const getRiskConfig = (level) => {
    const configs = {
      low: { 
        color: "bg-green-100 text-green-800 border-green-300", 
        icon: CheckCircle,
        bg: "from-green-50 to-emerald-50"
      },
      moderate: { 
        color: "bg-yellow-100 text-yellow-800 border-yellow-300", 
        icon: AlertTriangle,
        bg: "from-yellow-50 to-amber-50"
      },
      high: { 
        color: "bg-orange-100 text-orange-800 border-orange-300", 
        icon: AlertTriangle,
        bg: "from-orange-50 to-red-50"
      },
      critical: { 
        color: "bg-red-100 text-red-800 border-red-300", 
        icon: AlertTriangle,
        bg: "from-red-50 to-rose-50"
      }
    };
    return configs[level] || configs.moderate;
  };

  const config = getRiskConfig(prediction.risk_level);
  const RiskIcon = config.icon;

  return (
    <Card className={`border-2 shadow-lg overflow-hidden ${config.color.split(' ')[2]}`}>
      <div className={`bg-gradient-to-r ${config.bg} border-b p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`${config.color.split(' ').slice(0, 2).join(' ')} p-2 rounded-lg border`}>
              <RiskIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900">{prediction.pest_or_disease}</h3>
                <Badge className={`${config.color} border`}>
                  {prediction.risk_level.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {prediction.expected_timeframe}
                </span>
                <span className="font-semibold text-gray-900">
                  {prediction.probability}% probability
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Affected Crops */}
        {prediction.affected_crops && prediction.affected_crops.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-gray-900">Crops at Risk</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {prediction.affected_crops.map((crop, i) => (
                <Badge key={i} variant="outline" className="bg-white">
                  {crop}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Weather Factors */}
        {prediction.weather_factors && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Contributing Conditions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Temperature</div>
                <div className="font-semibold text-gray-900">
                  {prediction.weather_factors.temperature}°F
                </div>
              </div>
              <div>
                <div className="text-gray-600">Humidity</div>
                <div className="font-semibold text-gray-900">
                  {prediction.weather_factors.humidity}%
                </div>
              </div>
              <div>
                <div className="text-gray-600">Rainfall</div>
                <div className="font-semibold text-gray-900">
                  {prediction.weather_factors.rainfall}"
                </div>
              </div>
              <div>
                <div className="text-gray-600">Conditions</div>
                <div className="font-semibold text-gray-900">
                  {prediction.weather_factors.conditions}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preventative Measures */}
        {prediction.preventative_measures && prediction.preventative_measures.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Preventative Measures</h4>
            </div>
            <ul className="space-y-2">
              {prediction.preventative_measures.map((measure, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm">{measure}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Location */}
        {prediction.location && (
          <div className="text-sm text-gray-600">
            📍 Location: <span className="font-medium text-gray-900">{prediction.location}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}