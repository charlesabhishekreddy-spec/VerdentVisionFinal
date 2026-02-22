import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Play, XCircle } from "lucide-react";

export default function TaskStats({ tasks }) {
  const stats = [
    {
      label: "Total Tasks",
      value: tasks.length,
      icon: Clock,
      color: "bg-blue-500"
    },
    {
      label: "Pending",
      value: tasks.filter(t => t.status === 'pending').length,
      icon: Clock,
      color: "bg-orange-500"
    },
    {
      label: "In Progress",
      value: tasks.filter(t => t.status === 'in_progress').length,
      icon: Play,
      color: "bg-purple-500"
    },
    {
      label: "Completed",
      value: tasks.filter(t => t.status === 'completed').length,
      icon: CheckCircle,
      color: "bg-green-500"
    }
  ];

  return (
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
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}