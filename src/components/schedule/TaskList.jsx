import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export default function TaskList({ tasks, onToggle }) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground">No tasks yet.</p>
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <Card key={task.id}>
          <CardContent className="flex justify-between items-center p-4">
            
            <div className="flex items-center gap-3">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => onToggle(task.id)}
              />

              <span className={task.completed ? "line-through opacity-60" : ""}>
                {task.title}
              </span>
            </div>

            <Badge variant={
              task.priority === "High"
                ? "destructive"
                : task.priority === "Medium"
                ? "secondary"
                : "outline"
            }>
              {task.priority}
            </Badge>

          </CardContent>
        </Card>
      ))}
    </div>
  )
}