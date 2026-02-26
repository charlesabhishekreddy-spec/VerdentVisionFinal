import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, AlertCircle, Shield } from "lucide-react";

export default function RiskSummary({ predictions }) {
  const riskCounts = predictions.reduce((acc, p) => {
    acc[p.risk_level] = (acc[p.risk_level] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    {
      label: "Low Risk",
      value: riskCounts.low || 0,
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-700"
    },
    {
      label: "Moderate Risk",
      value: riskCounts.moderate || 0,
      icon: AlertCircle,
      color: "bg-yellow-500",
      textColor: "text-yellow-700"
    },
    {
      label: "High Risk",
      value: riskCounts.high || 0,
      icon: AlertTriangle,
      color: "bg-orange-500",
      textColor: "text-orange-700"
    },
    {
      label: "Critical Risk",
      value: riskCounts.critical || 0,
      icon: AlertTriangle,
      color: "bg-red-500",
      textColor: "text-red-700"
    }
  ];

  const highestRisk = predictions.reduce((max, p) => {
    const levels = { low: 1, moderate: 2, high: 3, critical: 4 };
    return (levels[p.risk_level] || 0) > (levels[max?.risk_level] || 0) ? p : max;
  }, null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {highestRisk && (highestRisk.risk_level === 'high' || highestRisk.risk_level === 'critical') && (
        <Card className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-red-900 mb-1">⚠️ Urgent Alert</h4>
                <p className="text-sm text-red-800">
                  <strong>{highestRisk.pest_or_disease}</strong> poses a {highestRisk.risk_level} risk 
                  with {highestRisk.probability}% probability. Immediate action recommended.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <div className="text-sm text-gray-700">
                <strong>{predictions.length} active prediction{predictions.length !== 1 ? 's' : ''}</strong>
                {' '}based on recent weather patterns and historical disease data
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}