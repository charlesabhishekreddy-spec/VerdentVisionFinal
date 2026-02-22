import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function TaskForm({ onAdd }) {
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState("Medium")

  function submit(e) {
    e.preventDefault()

    if (!title) return

    onAdd({
      title,
      priority,
      completed: false,
    })

    setTitle("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Task</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="flex gap-3">
          <Input
            placeholder="Task name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            className="border rounded-md px-3"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <Button type="submit">Add</Button>
        </form>
      </CardContent>
    </Card>
  )
}