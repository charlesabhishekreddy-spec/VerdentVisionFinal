import WeatherDashboard from "@/components/weather/WeatherDashboard"
import WeatherRecommendations from "@/components/weather/WeatherRecommendations"

export default function Weather() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Weather Intelligence</h1>
        <p className="text-slate-600">Live weather and AI recommendations for your farm operations.</p>
      </div>
      <WeatherDashboard />
      <WeatherRecommendations />
    </div>
  )
}
