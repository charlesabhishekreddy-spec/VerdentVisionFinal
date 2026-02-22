import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  { title: "Active Tasks", value: "12" },
  { title: "Healthy Crops", value: "94%" },
  { title: "Predicted Yield", value: "+18%" },
]

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Farm Intelligence Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
          >
            <Card className="hover:shadow-xl transition">
              <CardHeader>
                <CardTitle>{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}