import { useMemo, useState } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus, Users, Activity, RefreshCw, Clock3, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserList from "../components/admin/UserList.jsx";
import InviteUserForm from "../components/admin/InviteUserForm.jsx";
import AdminStats from "../components/admin/AdminStats.jsx";

export default function Admin() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const queryClient = useQueryClient();

  const currentUserQuery = useQuery({
    queryKey: ["admin-current-user"],
    queryFn: () => appClient.auth.me(),
  });
  const currentUser = currentUserQuery.data;

  const isAdmin = currentUser?.role === "admin";

  const usersQuery = useQuery({
    queryKey: ["all-users"],
    queryFn: () => appClient.users.listUsers(200),
    enabled: isAdmin,
  });
  const users = usersQuery.data || [];

  const diagnosesQuery = useQuery({
    queryKey: ["all-diagnoses-admin"],
    queryFn: () => appClient.entities.PlantDiagnosis.list("-created_date", 200),
    enabled: isAdmin,
  });
  const allDiagnoses = diagnosesQuery.data || [];

  const tasksQuery = useQuery({
    queryKey: ["all-tasks-admin"],
    queryFn: () => appClient.entities.Task.list("-created_date", 200),
    enabled: isAdmin,
  });
  const allTasks = tasksQuery.data || [];

  const postsQuery = useQuery({
    queryKey: ["all-posts-admin"],
    queryFn: () => appClient.entities.ForumPost.list("-created_date", 200),
    enabled: isAdmin,
  });
  const allPosts = postsQuery.data || [];

  const authEventsQuery = useQuery({
    queryKey: ["admin-auth-events"],
    queryFn: () => appClient.security.listAuthEvents(60),
    enabled: isAdmin,
  });
  const authEvents = authEventsQuery.data || [];

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => appClient.users.updateUser(userId, updates),
    onSuccess: (_result, variables) => {
      const updateKeys = Object.keys(variables?.updates || {});
      if (updateKeys.includes("role")) {
        setActionFeedback({ type: "success", message: "User role updated successfully." });
      } else if (updateKeys.includes("account_status")) {
        setActionFeedback({ type: "success", message: "User account status updated successfully." });
      } else {
        setActionFeedback({ type: "success", message: "User record updated successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auth-events"] });
    },
    onError: (error) => {
      setActionFeedback({
        type: "error",
        message: error?.message || "Failed to update user. Please try again.",
      });
    },
  });

  const queryErrors = useMemo(() => {
    if (!isAdmin) return [];
    const sources = [
      { label: "Users", error: usersQuery.error },
      { label: "Diagnoses", error: diagnosesQuery.error },
      { label: "Tasks", error: tasksQuery.error },
      { label: "Posts", error: postsQuery.error },
      { label: "Auth events", error: authEventsQuery.error },
    ];
    return sources
      .filter((source) => source.error)
      .map((source) => `${source.label}: ${source.error?.message || "Failed to load."}`);
  }, [isAdmin, usersQuery.error, diagnosesQuery.error, tasksQuery.error, postsQuery.error, authEventsQuery.error]);

  if (currentUserQuery.isLoading || (isAdmin && usersQuery.isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-700">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (currentUserQuery.isError) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {currentUserQuery.error?.message || "Failed to validate your admin session."}
          </AlertDescription>
        </Alert>
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => currentUserQuery.refetch()}>
          Retry
        </Button>
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

  const formatEventDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString();
  };

  const refreshAdminData = () => {
    setActionFeedback(null);
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
    queryClient.invalidateQueries({ queryKey: ["all-diagnoses-admin"] });
    queryClient.invalidateQueries({ queryKey: ["all-tasks-admin"] });
    queryClient.invalidateQueries({ queryKey: ["all-posts-admin"] });
    queryClient.invalidateQueries({ queryKey: ["admin-auth-events"] });
  };

  const toggleRole = (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const confirmed = window.confirm(
      nextRole === "admin"
        ? `Grant admin access to ${user.email}?`
        : `Remove admin access from ${user.email}?`
    );
    if (!confirmed) return;
    setActionFeedback(null);
    updateUserMutation.mutate({ userId: user.id, updates: { role: nextRole } });
  };

  const toggleStatus = (user) => {
    const nextStatus = user.account_status === "suspended" ? "active" : "suspended";
    const confirmed = window.confirm(
      nextStatus === "suspended"
        ? `Suspend ${user.email}? This will revoke active sessions.`
        : `Re-activate ${user.email}?`
    );
    if (!confirmed) return;
    setActionFeedback(null);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAdminData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={() => setShowInviteForm(!showInviteForm)} className="bg-violet-600/90 hover:bg-violet-700 gap-2">
            <UserPlus className="w-5 h-5" /> Invite User
          </Button>
        </div>
      </div>

      {showInviteForm ? <InviteUserForm onClose={() => setShowInviteForm(false)} /> : null}
      {actionFeedback ? (
        <Alert variant={actionFeedback.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{actionFeedback.message}</AlertDescription>
        </Alert>
      ) : null}
      {queryErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {queryErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <AdminStats users={users} diagnoses={allDiagnoses} tasks={allTasks} posts={allPosts} />

      <div className="grid lg:grid-cols-2 gap-6">
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

        <Card className="glass-panel border-white/50 shadow-xl">
          <CardHeader className="border-b border-white/40 bg-white/20 rounded-t-2xl">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Clock3 className="w-5 h-5 text-violet-600" /> Recent Auth Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {authEventsQuery.isLoading ? (
              <div className="text-sm text-slate-600 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading audit events...
              </div>
            ) : authEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No recent auth events.</p>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {authEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border border-white/70 bg-white/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800 break-all">{event.type || "event"}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{formatEventDate(event.created_date)}</span>
                    </div>
                    <p className="text-sm text-slate-600 break-all mt-1">{event.email || event.user_email || "unknown user"}</p>
                    {event.metadata && Object.keys(event.metadata).length > 0 ? (
                      <p className="text-xs text-slate-500 mt-2 break-words">{JSON.stringify(event.metadata)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
