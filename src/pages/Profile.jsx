import FarmPreferences from "@/components/profile/FarmPreferences"
import DiagnosisHistory from "@/components/profile/DiagnosisHistory"
import TreatmentHistory from "@/components/profile/TreatmentHistory"

export default function Profile() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Profile</h1>
      <FarmPreferences />
      <DiagnosisHistory />
      <TreatmentHistory />
    </div>
  )
}
