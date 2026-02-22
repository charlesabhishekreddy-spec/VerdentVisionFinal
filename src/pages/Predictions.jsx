import PredictionCard from "@/components/predictions/PredictionCard"
import OutbreakList from "@/components/predictions/OutbreakList"
import OutbreakReportForm from "@/components/predictions/OutbreakReportForm"
import RiskSummary from "@/components/predictions/RiskSummary"
import WeatherInput from "@/components/predictions/WeatherInput"
import WeatherWidget from "@/components/predictions/WeatherWidget"

export default function Predictions() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Pest & Disease Predictions</h1>
      <RiskSummary />
      <WeatherWidget />
      <PredictionCard />
      <OutbreakReportForm />
      <WeatherInput />
      <OutbreakList />
    </div>
  )
}
