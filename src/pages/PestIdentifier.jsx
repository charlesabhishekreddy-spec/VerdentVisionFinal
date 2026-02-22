import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PestIdentifier() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Pest Identifier</h1>
      <Card>
        <CardHeader><CardTitle>Identify Pest</CardTitle></CardHeader>
        <CardContent>Upload/capture pest images and view matching treatments.</CardContent>
      </Card>
    </div>
  )
}
