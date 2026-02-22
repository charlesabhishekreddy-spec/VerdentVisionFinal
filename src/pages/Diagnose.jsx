import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import DiagnosisResult from "@/components/diagnose/DiagnosisResult"
import TreatmentRecommendations from "@/components/diagnose/TreatmentRecommendations"
import FeedbackForm from "@/components/diagnose/FeedbackForm"

export default function Diagnose() {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)

  function handleUpload(e) {
    const file = e.target.files[0]
    if (file) {
      setImage(URL.createObjectURL(file))
      setResult(null)
    }
  }

  function runDiagnosis() {
    setTimeout(() => {
      setResult({ ready: true })
    }, 700)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Plant Disease Diagnosis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload Plant Image</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <input type="file" accept="image/*" onChange={handleUpload} />

          {image && <img src={image} alt="preview" className="rounded-xl max-h-80 object-cover" />}

          {image && <Button onClick={runDiagnosis}>Run AI Diagnosis</Button>}
        </CardContent>
      </Card>

      {result && (
        <>
          <DiagnosisResult />
          <TreatmentRecommendations />
          <FeedbackForm />
        </>
      )}
    </div>
  )
}
