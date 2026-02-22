import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Diagnosis Dashboard</h1>
      <Card>
        <CardHeader><CardTitle>Diagnosis Analytics</CardTitle></CardHeader>
        <CardContent>History list, severity stats, and CSV export live here.</CardContent>
      </Card>
    </div>
  )
}
