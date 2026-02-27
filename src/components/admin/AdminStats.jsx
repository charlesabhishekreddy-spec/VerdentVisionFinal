import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, Calendar, MessageSquare, TrendingUp } from "lucide-react";

export default function AdminStats({ users, diagnoses, tasks, posts }) {
  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: Users,
      color: "from-violet-500 to-violet-600",
      change: "+12% this month"
    },
    {
      label: "Plant Diagnoses",
      value: diagnoses.length,
      icon: Activity,
      color: "from-purple-500 to-fuchsia-600",
      change: `${diagnoses.filter(d => {
        const date = new Date(d.created_date);
        const now = new Date();
        return date.getMonth() === now.getMonth();
      }).length} this month`
    },
    {
      label: "Active Tasks",
      value: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
      icon: Calendar,
      color: "from-indigo-500 to-violet-600",
      change: `${tasks.length} total`
    },
    {
      label: "Forum Posts",
      value: posts.length,
      icon: MessageSquare,
      color: "from-fuchsia-500 to-violet-600",
      change: `${posts.filter(p => {
        const date = new Date(p.created_date);
        const now = new Date();
        return date.getMonth() === now.getMonth();
      }).length} this month`
    }
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-none shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${stat.color} p-4`}>
                <Icon className="w-8 h-8 text-white opacity-90" />
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
