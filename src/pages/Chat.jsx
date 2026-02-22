import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Chat() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">AI Farming Assistant</h1>
      <Card>
        <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
        <CardContent>Chat history and farming advice UI goes here.</CardContent>
      </Card>
    </div>
  )
}
