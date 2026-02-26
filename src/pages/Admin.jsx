import { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus, Users, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserList from "../components/admin/UserList.jsx";
import InviteUserForm from "../components/admin/InviteUserForm.jsx";
import AdminStats from "../components/admin/AdminStats.jsx";

export default function Admin() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);

      if (user.role !== 'admin') {
        setError('Admin access is restricted. Only charlesabhishekreddy@gmail.com has admin rights.');
        return [];
      }
      return appClient.entities.User.list('-created_date', 100);
    },
  });

  const { data: allDiagnoses = [] } = useQuery({
    queryKey: ['all-diagnoses-admin'],
    queryFn: () => appClient.entities.PlantDiagnosis.list('-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks-admin'],
    queryFn: () => appClient.entities.Task.list('-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['all-posts-admin'],
    queryFn: () => appClient.entities.ForumPost.list('-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Alert className="glass-panel border-amber-300/40 bg-amber-100/40 text-amber-900">
          <Shield className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-700">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="glass-panel p-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" /> Admin Controls
          </h2>
          <p className="text-slate-600 mt-1">Manage users, monitor activity, and oversee the platform.</p>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)} className="bg-blue-600/90 hover:bg-blue-700 gap-2">
          <UserPlus className="w-5 h-5" /> Invite User
        </Button>
      </div>

      {showInviteForm && <InviteUserForm onClose={() => setShowInviteForm(false)} />}

      <AdminStats users={users} diagnoses={allDiagnoses} tasks={allTasks} posts={allPosts} />

      <Card className="glass-panel border-white/50 shadow-xl">
        <CardHeader className="border-b border-white/40 bg-white/20 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-blue-600" /> User Management ({users.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <UserList users={users} currentUser={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}
