import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus, Users, TrendingUp, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserList from "../components/admin/UserList.jsx";
import InviteUserForm from "../components/admin/InviteUserForm.jsx";
import AdminStats from "../components/admin/AdminStats.jsx";

export default function Admin() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      if (user.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        return [];
      }
      
      return await base44.entities.User.list('-created_date', 100);
    }
  });

  const { data: allDiagnoses = [] } = useQuery({
    queryKey: ['all-diagnoses-admin'],
    queryFn: () => base44.entities.PlantDiagnosis.list('-created_date', 100),
    enabled: currentUser?.role === 'admin'
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks-admin'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    enabled: currentUser?.role === 'admin'
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['all-posts-admin'],
    queryFn: () => base44.entities.ForumPost.list('-created_date', 100),
    enabled: currentUser?.role === 'admin'
  });

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Alert variant="destructive">
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
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Admin Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Manage users, monitor activity, and oversee the platform</p>
        </div>
        <Button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Invite User
        </Button>
      </div>

      {showInviteForm && (
        <InviteUserForm onClose={() => setShowInviteForm(false)} />
      )}

      <AdminStats 
        users={users} 
        diagnoses={allDiagnoses} 
        tasks={allTasks} 
        posts={allPosts}
      />

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            User Management ({users.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <UserList users={users} currentUser={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}