import { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, BarChart3 } from "lucide-react";
import TaskList from "../components/schedule/TaskList.jsx";
import TaskForm from "../components/schedule/TaskForm.jsx";
import TaskStats from "../components/schedule/TaskStats.jsx";
import TaskReports from "../components/schedule/TaskReports.jsx";
import AITaskSuggestions from "../components/schedule/AITaskSuggestions.jsx";

export default function Schedule() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showReports, setShowReports] = useState(true);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => appClient.entities.Task.list('-due_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['upcoming-tasks']);
      setShowForm(false);
      setEditingTask(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['upcoming-tasks']);
      setShowForm(false);
      setEditingTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['upcoming-tasks']);
    },
  });

  const handleSubmit = (data) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleStatusChange = (task, newStatus) => {
    updateMutation.mutate({
      id: task.id,
      data: { ...task, status: newStatus }
    });
  };

  const filteredTasks = filterStatus === "all" 
    ? tasks 
    : tasks.filter(t => t.status === filterStatus);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
          <p className="text-gray-600">Manage your farming tasks and activities</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowReports(!showReports)}
            variant="outline"
            className="gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            {showReports ? "Hide Reports" : "View Reports"}
          </Button>
          <Button
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </Button>
        </div>
      </div>

      <TaskStats tasks={tasks} />

      {showReports && <TaskReports tasks={tasks} />}

      <AITaskSuggestions />

      {showForm && (
        <TaskForm
          task={editingTask}
          allTasks={tasks}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-violet-600" />
              All Tasks
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'in_progress', 'completed', 'blocked'].map(status => (
                <Button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  className={filterStatus === status ? "bg-violet-600 hover:bg-violet-700" : ""}
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <TaskList
            tasks={filteredTasks}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
            onStatusChange={handleStatusChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
