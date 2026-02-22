import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Mail, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InviteUserForm({ onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries(['all-users']);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Invite New User
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {success ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Invitation sent successfully! User will receive an email with login instructions.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={inviteMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="role">User Role *</Label>
              <Select value={role} onValueChange={setRole} disabled={inviteMutation.isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div>
                      <div className="font-medium">Regular User</div>
                      <div className="text-xs text-gray-500">Can access all farming features</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div>
                      <div className="font-medium">Administrator</div>
                      <div className="text-xs text-gray-500">Full access including user management</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to send invitation. Please try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={inviteMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}