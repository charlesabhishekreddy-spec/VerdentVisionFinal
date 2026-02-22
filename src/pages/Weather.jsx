import WeatherDashboard from "@/components/weather/WeatherDashboard"
import WeatherRecommendations from "@/components/weather/WeatherRecommendations"

export default function Weather() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Weather Intelligence</h1>
      <WeatherDashboard />
      <WeatherRecommendations />
    </div>
  )
}
