import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Calendar, Mail } from "lucide-react";

export default function UserList({ users, currentUser }) {
  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <Badge className="bg-purple-100 text-purple-800 gap-1">
        <Shield className="w-3 h-3" />
        Admin
      </Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 gap-1">
      <User className="w-3 h-3" />
      User
    </Badge>;
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className={`p-4 rounded-lg border ${
            user.id === currentUser?.id
              ? "bg-blue-50 border-blue-200"
              : "bg-white border-gray-200"
          } hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {user.full_name || "Unnamed User"}
                  </h3>
                  {user.id === currentUser?.id && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Joined {new Date(user.created_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div>
              {getRoleBadge(user.role)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}