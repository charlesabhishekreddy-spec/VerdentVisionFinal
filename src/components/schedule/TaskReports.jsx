import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const parseDateSafe = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateSafe = (value) => {
  const date = parseDateSafe(value);
  return date ? format(date, "MMM d, yyyy") : "No due date";
};

const TASK_TYPES = [
  "watering",
  "fertilizing",
  "pest_control",
  "pruning",
  "harvesting",
  "planting",
  "soil_prep",
  "monitoring",
  "other",
];

export default function TaskReports({ tasks }) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const statusData = [
    { name: "Pending", value: tasks.filter((task) => task.status === "pending").length, color: "#f59e0b" },
    { name: "In Progress", value: tasks.filter((task) => task.status === "in_progress").length, color: "#3b82f6" },
    { name: "Completed", value: tasks.filter((task) => task.status === "completed").length, color: "#10b981" },
    { name: "Blocked", value: tasks.filter((task) => task.status === "blocked").length, color: "#ef4444" },
    { name: "Skipped", value: tasks.filter((task) => task.status === "skipped").length, color: "#6b7280" },
  ].filter((item) => item.value > 0);

  const taskTypeData = TASK_TYPES
    .map((type) => {
      const typeTasks = tasks.filter((task) => task.task_type === type);
      const completedCount = typeTasks.filter((task) => task.status === "completed").length;
      return {
        type: type.replace("_", " "),
        total: typeTasks.length,
        completed: completedCount,
        rate: typeTasks.length > 0 ? Math.round((completedCount / typeTasks.length) * 100) : 0,
      };
    })
    .filter((item) => item.total > 0);

  const overdueTasks = tasks.filter((task) => {
    if (task.status === "completed" || task.status === "skipped") return false;
    const dueDate = parseDateSafe(task.due_date);
    if (!dueDate) return false;
    return dueDate < todayStart;
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const priorityData = [
    { name: "Low", value: tasks.filter((task) => task.priority === "low").length, color: "#3b82f6" },
    { name: "Medium", value: tasks.filter((task) => task.priority === "medium").length, color: "#f59e0b" },
    { name: "High", value: tasks.filter((task) => task.priority === "high").length, color: "#f97316" },
    { name: "Urgent", value: tasks.filter((task) => task.priority === "urgent").length, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded-lg bg-violet-600 p-2">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
            <div className="text-xs text-gray-500">Completion Rate</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded-lg bg-violet-500 p-2">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{completedTasks}/{totalTasks}</div>
            <div className="text-xs text-gray-500">Tasks Completed</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded-lg bg-red-500 p-2">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{overdueTasks.length}</div>
            <div className="text-xs text-gray-500">Overdue Tasks</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded-lg bg-indigo-500 p-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {tasks.filter((task) => task.status === "in_progress").length}
            </div>
            <div className="text-xs text-gray-500">Active Tasks</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`priority-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {taskTypeData.length > 0 ? (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Completion Rate by Task Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: "Completion Rate (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const row = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
                          <p className="font-semibold capitalize">{row.type}</p>
                          <p className="text-sm text-gray-600">Total: {row.total}</p>
                          <p className="text-sm text-gray-600">Completed: {row.completed}</p>
                          <p className="text-sm font-semibold text-violet-600">Rate: {row.rate}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="rate" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {overdueTasks.length > 0 ? (
        <Card className="border-l-4 border-l-red-500 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
                  <div>
                    <p className="font-semibold text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-600">
                      Due: {formatDateSafe(task.due_date)}
                      {task.assigned_to ? ` | Assigned to: ${task.assigned_to}` : ""}
                    </p>
                  </div>
                  <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    {task.priority}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
