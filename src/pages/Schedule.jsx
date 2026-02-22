import { useState } from "react"
import TaskForm from "@/components/schedule/TaskForm"
import TaskList from "@/components/schedule/TaskList"
import TaskStats from "@/components/schedule/TaskStats"
import TaskReports from "@/components/schedule/TaskReports"
import AITaskSuggestions from "@/components/schedule/AITaskSuggestions"
import RecurringTaskForm from "@/components/schedule/RecurringTaskForm"

export default function Schedule() {
  const [tasks, setTasks] = useState([])

  function addTask(task) {
    setTasks([...tasks, { ...task, id: Date.now() }])
  }

  function toggleTask(id) {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Farm Task Scheduler</h1>
      <TaskStats />
      <TaskForm onAdd={addTask} />
      <RecurringTaskForm />
      <TaskList tasks={tasks} onToggle={toggleTask} />
      <TaskReports />
      <AITaskSuggestions />
    </div>
  )
}
