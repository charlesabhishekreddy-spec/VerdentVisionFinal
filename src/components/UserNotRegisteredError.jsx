import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UserNotRegisteredError() {
  return (
    <Card>
      <CardHeader><CardTitle>User Not Registered</CardTitle></CardHeader>
      <CardContent>Prompt shown when account is not provisioned.</CardContent>
    </Card>
  )
}
