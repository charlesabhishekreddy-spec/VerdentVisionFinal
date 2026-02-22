import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RecurringTaskForm from "./RecurringTaskForm.jsx";

export default function TaskForm({ task, onSubmit, onCancel, isLoading, allTasks }) {
  const [formData, setFormData] = useState(task || {
    title: "",
    description: "",
    task_type: "watering",
    due_date: "",
    priority: "medium",
    status: "pending",
    crop_name: "",
    location: "",
    weather_dependent: false,
    assigned_to: "",
    depends_on: []
  });

  // Fetch all users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b bg-green-50">
        <div className="flex items-center justify-between">
          <CardTitle>{task ? "Edit Task" : "Create New Task"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Water tomato plants"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about the task..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="task_type">Task Type *</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watering">Watering</SelectItem>
                  <SelectItem value="fertilizing">Fertilizing</SelectItem>
                  <SelectItem value="pest_control">Pest Control</SelectItem>
                  <SelectItem value="pruning">Pruning</SelectItem>
                  <SelectItem value="harvesting">Harvesting</SelectItem>
                  <SelectItem value="planting">Planting</SelectItem>
                  <SelectItem value="soil_prep">Soil Preparation</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="crop_name">Crop/Plant Name</Label>
              <Input
                id="crop_name"
                value={formData.crop_name}
                onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                placeholder="e.g., Tomatoes"
              />
            </div>

            <div>
              <Label htmlFor="location">Location/Field</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., North Field"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to || ""}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="depends_on">Task Dependencies</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.depends_on?.includes(value)) {
                    setFormData({ 
                      ...formData, 
                      depends_on: [...(formData.depends_on || []), value] 
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add task dependency (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {allTasks?.filter(t => t.id !== task?.id).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} - {t.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.depends_on?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.depends_on.map(depId => {
                    const depTask = allTasks?.find(t => t.id === depId);
                    return depTask ? (
                      <div key={depId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {depTask.title}
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            depends_on: formData.depends_on.filter(id => id !== depId)
                          })}
                          className="ml-1 hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          <RecurringTaskForm formData={formData} setFormData={setFormData} />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                task ? "Update Task" : "Create Task"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}