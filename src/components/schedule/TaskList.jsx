import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Sprout,
  Bug,
  Scissors,
  Package,
  Shovel,
  Eye,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Play,
  User,
  Link,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const formatDueDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return format(date, "MMM d, yyyy");
};

export default function TaskList({ tasks, onEdit, onDelete, onStatusChange }) {
  const getTaskIcon = (type) => {
    const icons = {
      watering: Droplets,
      fertilizing: Sprout,
      pest_control: Bug,
      pruning: Scissors,
      harvesting: Package,
      planting: Sprout,
      soil_prep: Shovel,
      monitoring: Eye,
      other: MoreHorizontal,
    };
    return icons[type] || MoreHorizontal;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-blue-100 text-blue-800 border-blue-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      urgent: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      blocked: "bg-red-100 text-red-800",
      skipped: "bg-orange-100 text-orange-800",
    };
    return colors[status] || colors.pending;
  };

  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-600">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const Icon = getTaskIcon(task.task_type);
        return (
          <div
            key={task.id}
            className="flex items-center gap-4 rounded-xl border border-white/70 bg-white/70 p-4 backdrop-blur-lg transition-shadow hover:shadow-md"
          >
            <div className={`rounded-lg p-3 ${task.status === "completed" ? "bg-green-100" : "bg-gray-100"}`}>
              <Icon className={`h-5 w-5 ${task.status === "completed" ? "text-green-600" : "text-gray-600"}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-start gap-2">
                <h4 className={`font-semibold text-gray-900 ${task.status === "completed" ? "line-through" : ""}`}>
                  {task.title}
                </h4>
                <Badge className={`${getPriorityColor(task.priority)} border text-xs`}>{task.priority}</Badge>
              </div>
              {task.description ? <p className="mb-2 text-sm text-gray-600">{task.description}</p> : null}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {task.crop_name ? <span>Crop: {task.crop_name}</span> : null}
                {task.location ? <span>Field: {task.location}</span> : null}
                <span>Due: {formatDueDate(task.due_date)}</span>
                {task.assigned_to ? (
                  <span className="flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-purple-700">
                    <User className="h-3 w-3" />
                    {task.assigned_to.split("@")[0]}
                  </span>
                ) : null}
                {task.depends_on?.length > 0 ? (
                  <span className="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                    <Link className="h-3 w-3" />
                    {task.depends_on.length} dependencies
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {task.status !== "in_progress" ? (
                    <DropdownMenuItem onClick={() => onStatusChange(task, "in_progress")}>
                      <Play className="mr-2 h-4 w-4" />
                      Start Task
                    </DropdownMenuItem>
                  ) : null}
                  {task.status !== "completed" ? (
                    <DropdownMenuItem onClick={() => onStatusChange(task, "completed")}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Task
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
