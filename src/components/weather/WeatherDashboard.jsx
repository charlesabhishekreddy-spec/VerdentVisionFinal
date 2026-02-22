import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function WeatherDashboard() {
  return (
    <Card>
      <CardHeader><CardTitle>Weather Dashboard</CardTitle></CardHeader>
      <CardContent>Current conditions, 7-day forecast, weather alerts, and refresh actions.</CardContent>
    </Card>
  )
}
