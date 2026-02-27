import { useState } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus, Users, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserList from "../components/admin/UserList.jsx";
import InviteUserForm from "../components/admin/InviteUserForm.jsx";
import AdminStats from "../components/admin/AdminStats.jsx";

export default function Admin() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ["admin-current-user"],
    queryFn: () => appClient.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => appClient.users.listUsers(200),
    enabled: isAdmin,
  });

  const { data: allDiagnoses = [] } = useQuery({
    queryKey: ["all-diagnoses-admin"],
    queryFn: () => appClient.entities.PlantDiagnosis.list("-created_date", 200),
    enabled: isAdmin,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["all-tasks-admin"],
    queryFn: () => appClient.entities.Task.list("-created_date", 200),
    enabled: isAdmin,
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ["all-posts-admin"],
    queryFn: () => appClient.entities.ForumPost.list("-created_date", 200),
    enabled: isAdmin,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => appClient.users.updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });

  if (loadingUser || (isAdmin && loadingUsers)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-700">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Alert className="glass-panel border-amber-300/40 bg-amber-100/40 text-amber-900">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Admin access is restricted. Only users with admin role can access this panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const toggleRole = (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    updateUserMutation.mutate({ userId: user.id, updates: { role: nextRole } });
  };

  const toggleStatus = (user) => {
    const nextStatus = user.account_status === "suspended" ? "active" : "suspended";
    updateUserMutation.mutate({ userId: user.id, updates: { account_status: nextStatus } });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="glass-panel p-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Shield className="w-8 h-8 text-violet-600" /> Admin Controls
          </h2>
          <p className="text-slate-600 mt-1">
            Manage user roles, account status, and operational activity with enterprise controls.
          </p>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)} className="bg-violet-600/90 hover:bg-violet-700 gap-2">
          <UserPlus className="w-5 h-5" /> Invite User
        </Button>
      </div>

      {showInviteForm ? <InviteUserForm onClose={() => setShowInviteForm(false)} /> : null}

      <AdminStats users={users} diagnoses={allDiagnoses} tasks={allTasks} posts={allPosts} />

      <Card className="glass-panel border-white/50 shadow-xl">
        <CardHeader className="border-b border-white/40 bg-white/20 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-violet-600" /> User Management ({users.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <UserList
            users={users}
            currentUser={currentUser}
            onToggleRole={toggleRole}
            onToggleStatus={toggleStatus}
            updatingUserId={updateUserMutation.variables?.userId}
            isUpdating={updateUserMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
