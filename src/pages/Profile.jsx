import { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, LogOut, Activity, Award } from "lucide-react";
import { createPageUrl } from "@/utils";
import FarmPreferences from "../components/profile/FarmPreferences.jsx";
import DiagnosisHistory from "../components/profile/DiagnosisHistory.jsx";
import TreatmentHistory from "../components/profile/TreatmentHistory.jsx";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    appClient.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: diagnoses = [] } = useQuery({
    queryKey: ['user-diagnoses'],
    queryFn: () => appClient.entities.PlantDiagnosis.list('-created_date'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: () => appClient.entities.Task.list('-created_date'),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts'],
    queryFn: () => appClient.entities.ForumPost.list('-created_date'),
  });

  const handleLogout = () => {
    appClient.auth.logout(createPageUrl("Home"));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>

      {/* User Info Card */}
      <Card className="border-none shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
              <User className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{user?.full_name || 'User'}</h3>
              <p className="text-blue-100">{user?.email}</p>
              {user?.farm_name && <p className="text-blue-100 text-sm">{user.farm_name}</p>}
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{diagnoses.length}</p>
                <p className="text-sm text-gray-600">Diagnoses</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Activity className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                <p className="text-sm text-gray-600">Tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Award className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
                <p className="text-sm text-gray-600">Posts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farm Preferences */}
      <FarmPreferences user={user} />

      {/* Diagnosis History */}
      <DiagnosisHistory diagnoses={diagnoses} />

      {/* Treatment History */}
      <TreatmentHistory />

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full border-red-300 text-red-600 hover:bg-red-50 gap-2"
      >
        <LogOut className="w-5 h-5" />
        Logout
      </Button>
    </div>
  );
}
