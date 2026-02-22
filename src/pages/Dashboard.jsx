import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, Download, FileText } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [exporting, setExporting] = useState(false);

  const { data: diagnoses = [] } = useQuery({
    queryKey: ['all-diagnoses'],
    queryFn: () => base44.entities.PlantDiagnosis.list('-created_date'),
  });

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['Date', 'Plant Name', 'Disease', 'Severity', 'Confidence', 'Status'];
      const rows = diagnoses.map(d => [
        format(new Date(d.created_date), 'yyyy-MM-dd'),
        d.plant_name,
        d.disease_name,
        d.severity,
        `${d.confidence_score}%`,
        d.status
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plant-diagnoses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const getSeverityStats = () => {
    const stats = { low: 0, medium: 0, high: 0, critical: 0 };
    diagnoses.forEach(d => {
      stats[d.severity] = (stats[d.severity] || 0) + 1;
    });
    return stats;
  };

  const severityStats = getSeverityStats();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Diagnosis History</h2>
          <p className="text-gray-600">View and export your plant diagnosis records</p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={diagnoses.length === 0 || exporting}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{diagnoses.length}</div>
            <div className="text-xs text-gray-500">Total Diagnoses</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{severityStats.low || 0}</div>
            <div className="text-xs text-gray-500">Low Risk</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{severityStats.medium || 0}</div>
            <div className="text-xs text-gray-500">Medium Risk</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{(severityStats.high || 0) + (severityStats.critical || 0)}</div>
            <div className="text-xs text-gray-500">High Risk</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-green-50">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            All Plant Diagnoses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {diagnoses.length > 0 ? (
            <div className="space-y-4">
              {diagnoses.map((diagnosis) => (
                <div key={diagnosis.id} className="flex items-center gap-4 p-4 bg-white border rounded-xl hover:shadow-md transition-shadow">
                  {diagnosis.image_url && (
                    <img
                      src={diagnosis.image_url}
                      alt={diagnosis.plant_name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{diagnosis.plant_name}</h4>
                    <p className="text-sm text-gray-600">{diagnosis.disease_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {format(new Date(diagnosis.created_date), 'MMM d, yyyy')}
                      </span>
                      {diagnosis.confidence_score && (
                        <span className="text-xs text-blue-600 font-medium">
                          {diagnosis.confidence_score}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      diagnosis.severity === 'low' ? 'bg-green-100 text-green-700' :
                      diagnosis.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {diagnosis.severity}
                    </div>
                    {diagnosis.symptoms && diagnosis.symptoms.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {diagnosis.symptoms.length} symptoms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No diagnoses yet</h3>
              <p className="text-gray-500 mb-4">Start by diagnosing your first plant!</p>
              <Button 
                onClick={() => window.location.href = '/Diagnose'}
                className="bg-green-600 hover:bg-green-700"
              >
                Diagnose a Plant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}