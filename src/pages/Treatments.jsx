import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Treatments() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Treatments Library</h1>
      <Card>
        <CardHeader><CardTitle>Treatment Catalog</CardTitle></CardHeader>
        <CardContent>Browse treatments by disease, method, and safety profile.</CardContent>
      </Card>
    </div>
  )
}
