/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, UserPlus, Activity } from "lucide-react";
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import UserList from "../components/admin/UserList.jsx";
import InviteUserForm from "../components/admin/InviteUserForm.jsx";
import AdminStats from "../components/admin/AdminStats.jsx";

export default function Admin() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const usersData = await res.json();
      // Set first user as current user for demo (replace with auth in real app)
      setCurrentUser(usersData[0] || null);
      if (usersData[0]?.role !== "admin") {
        setError("Access denied. Admin privileges required.");
      }
      return usersData;
    },
  });

  // Fetch other stats (diagnoses, tasks, posts)
  const { data: allDiagnoses = [] } = useQuery({
    queryKey: ["all-diagnoses-admin"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/diagnoses");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: currentUser?.role === "admin",
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["all-tasks-admin"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/tasks");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: currentUser?.role === "admin",
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ["all-posts-admin"],
    queryFn: async () => {
      const res = await fetch("http://localhost:5000/api/posts");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: currentUser?.role === "admin",
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

      {showInviteForm && <InviteUserForm onClose={() => setShowInviteForm(false)} />}

      <AdminStats users={users} diagnoses={allDiagnoses} tasks={allTasks} posts={allPosts} />

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