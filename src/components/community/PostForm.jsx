import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Upload } from "lucide-react";

import { createPost } from "@/api/communityApi"; // ✅ new import

export default function PostForm({ onSubmit, onCancel, isLoading, setPosts }) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    images: []
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const newPost = await createPost(formData);
      setPosts(prev => [newPost, ...prev]); // update the post list
      onCancel();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b bg-green-50 flex justify-between items-center">
        <CardTitle>Create New Post</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What's your question or topic?"
              required
            />
          </div>
          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share your experience, ask a question, or provide advice..."
              rows={6}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pest_control">Pest Control</SelectItem>
                <SelectItem value="disease_management">Disease Management</SelectItem>
                <SelectItem value="organic_farming">Organic Farming</SelectItem>
                <SelectItem value="irrigation">Irrigation</SelectItem>
                <SelectItem value="soil_health">Soil Health</SelectItem>
                <SelectItem value="fertilizers">Fertilizers</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={uploading || isLoading} className="bg-green-600 hover:bg-green-700">
              {uploading ? "Posting..." : "Post to Community"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}