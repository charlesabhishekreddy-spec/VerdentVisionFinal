import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, TrendingUp } from "lucide-react";
import PostList from "../components/community/PostList.jsx";
import PostForm from "../components/community/PostForm.jsx";
import CommunityStats from "../components/community/CommunityStats.jsx";

export default function Community() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const queryClient = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ['forum-posts'],
    queryFn: () => appClient.entities.ForumPost.list('-created_date'),
  });

  const createPostMutation = useMutation({
    mutationFn: (data) => appClient.entities.ForumPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-posts']);
      setShowForm(false);
    },
  });

  const handleSubmit = async (data) => {
    const user = await appClient.auth.me().catch(() => ({ full_name: 'Anonymous' }));
    createPostMutation.mutate({
      ...data,
      author_name: user.full_name,
      likes_count: 0,
      comments_count: 0
    });
  };

  const filteredPosts = selectedCategory === "all"
    ? posts
    : posts.filter(p => p.category === selectedCategory);

  const categories = [
    { value: "all", label: "All Posts" },
    { value: "pest_control", label: "Pest Control" },
    { value: "disease_management", label: "Disease Management" },
    { value: "organic_farming", label: "Organic Farming" },
    { value: "irrigation", label: "Irrigation" },
    { value: "soil_health", label: "Soil Health" },
    { value: "fertilizers", label: "Fertilizers" },
    { value: "general", label: "General" }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-green-600" />
            Community Forum
          </h2>
          <p className="text-gray-600">Share experiences and learn from fellow farmers</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus className="w-5 h-5" />
          New Post
        </Button>
      </div>

      <CommunityStats posts={posts} />

      {showForm && (
        <PostForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          isLoading={createPostMutation.isPending}
        />
      )}

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                className={selectedCategory === cat.value ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <PostList posts={filteredPosts} />
        </CardContent>
      </Card>
    </div>
  );
}