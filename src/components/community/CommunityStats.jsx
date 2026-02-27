import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageCircle, TrendingUp, Award } from "lucide-react";

export default function CommunityStats({ posts }) {
  const stats = [
    {
      label: "Total Posts",
      value: posts.length,
      icon: MessageCircle,
      color: "bg-violet-500"
    },
    {
      label: "Active Members",
      value: new Set(posts.map(p => p.author_name)).size,
      icon: Users,
      color: "bg-fuchsia-500"
    },
    {
      label: "Solved Questions",
      value: posts.filter(p => p.is_solved).length,
      icon: Award,
      color: "bg-indigo-500"
    },
    {
      label: "Total Engagement",
      value: posts.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0),
      icon: TrendingUp,
      color: "bg-violet-600"
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
