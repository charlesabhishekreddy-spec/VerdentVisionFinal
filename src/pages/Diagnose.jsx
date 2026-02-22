import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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

  // temporary fake AI response
  function runDiagnosis() {
    setTimeout(() => {
      setResult({
        disease: "Leaf Blight",
        confidence: "92%",
        treatment:
          "Apply copper-based fungicide every 7 days. Remove infected leaves and improve airflow.",
      })
    }, 1200)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      <h1 className="text-3xl font-bold">Plant Disease Diagnosis</h1>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Plant Image</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <input type="file" accept="image/*" onChange={handleUpload} />

          {image && (
            <img
              src={image}
              alt="preview"
              className="rounded-xl max-h-80 object-cover"
            />
          )}

          {image && (
            <Button onClick={runDiagnosis}>
              Run AI Diagnosis
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Result Section */}
      {result && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle>Diagnosis Result</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <p><strong>Disease:</strong> {result.disease}</p>
            <p><strong>Confidence:</strong> {result.confidence}</p>
            <p><strong>Treatment:</strong> {result.treatment}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}