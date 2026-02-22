import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import PostList from "../components/community/PostList.jsx";
import PostForm from "../components/community/PostForm.jsx";
import CommunityStats from "../components/community/CommunityStats.jsx";
import { fetchPosts, createPost } from "@/api/communityApi"; // ✅ backend API

export default function Community() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [posts, setPosts] = useState([]);
  const queryClient = useQueryClient();

  // Fetch posts from backend
  const { isLoading } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: fetchPosts,
    onSuccess: (data) => setPosts(data),
  });

  // Mutation to create a new post
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: (newPost) => {
      setPosts((prev) => [newPost, ...prev]); // update local state
      setShowForm(false);
      queryClient.invalidateQueries(["forum-posts"]);
    },
  });

  const handleSubmit = (data) => {
    // Add default values
    const postData = {
      ...data,
      author_name: "Anonymous",
      likes_count: 0,
      comments_count: 0,
    };
    createPostMutation.mutate(postData);
  };

  const filteredPosts =
    selectedCategory === "all"
      ? posts
      : posts.filter((p) => p.category === selectedCategory);

  const categories = [
    { value: "all", label: "All Posts" },
    { value: "pest_control", label: "Pest Control" },
    { value: "disease_management", label: "Disease Management" },
    { value: "organic_farming", label: "Organic Farming" },
    { value: "irrigation", label: "Irrigation" },
    { value: "soil_health", label: "Soil Health" },
    { value: "fertilizers", label: "Fertilizers" },
    { value: "general", label: "General" },
  ];

  if (isLoading) {
    return <p className="text-center py-12">Loading posts...</p>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-green-600" />
            Community Forum
          </h2>
          <p className="text-gray-600">
            Share experiences and learn from fellow farmers
          </p>
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
          isLoading={createPostMutation.isLoading}
          setPosts={setPosts}
        />
      )}

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              size="sm"
              className={
                selectedCategory === cat.value
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }
            >
              {cat.label}
            </Button>
          ))}
        </CardHeader>
        <CardContent className="p-6">
          <PostList posts={filteredPosts} />
        </CardContent>
      </Card>
    </div>
  );
}