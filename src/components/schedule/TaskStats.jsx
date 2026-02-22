import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TaskStats() {
  return (
    <Card>
      <CardHeader><CardTitle>Task Statistics</CardTitle></CardHeader>
      <CardContent>Summary cards for pending, in-progress, and completed tasks.</CardContent>
    </Card>
  )
}
