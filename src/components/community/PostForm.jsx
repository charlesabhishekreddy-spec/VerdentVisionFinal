import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Image as ImageIcon, Upload } from "lucide-react";

export default function PostForm({ onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    images: [],
    tags: []
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
    } catch (error) {
      console.error("Failed to upload images:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b bg-green-50">
        <div className="flex items-center justify-between">
          <CardTitle>Create New Post</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>
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
                <SelectItem value="crop_rotation">Crop Rotation</SelectItem>
                <SelectItem value="fertilizers">Fertilizers</SelectItem>
                <SelectItem value="seeds">Seeds</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Images (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Images
                </>
              )}
            </Button>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        images: formData.images.filter((_, i) => i !== index)
                      })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post to Community"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}