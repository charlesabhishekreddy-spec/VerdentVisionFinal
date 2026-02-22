import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RiskSummary() {
  return (
    <Card>
      <CardHeader><CardTitle>Risk Summary</CardTitle></CardHeader>
      <CardContent>Aggregated risk overview across active predictions.</CardContent>
    </Card>
  )
}
