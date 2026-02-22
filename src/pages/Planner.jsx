import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Planner() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Crop Planner</h1>
      <Card>
        <CardHeader><CardTitle>Planning Timeline</CardTitle></CardHeader>
        <CardContent>Create/edit crop plans with stage tracking and schedules.</CardContent>
      </Card>
    </div>
  )
}
