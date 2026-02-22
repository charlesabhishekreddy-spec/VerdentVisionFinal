import { useState } from "react"
import TaskForm from "@/components/schedule/TaskForm"
import TaskList from "@/components/schedule/TaskList"

export default function Schedule() {
  const [tasks, setTasks] = useState([])

  function addTask(task) {
    setTasks([...tasks, { ...task, id: Date.now() }])
  }

  function toggleTask(id) {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Farm Task Scheduler</h1>

      <TaskForm onAdd={addTask} />
      <TaskList tasks={tasks} onToggle={toggleTask} />
    </div>
  )
}