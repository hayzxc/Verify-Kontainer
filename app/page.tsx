import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"
import { HomeRedirector } from "@/components/home-redirector"

export default async function Home() {
  // Fast server-side session check eliminates client-side waterfall for authenticated users
  const session = await verifySession()
  if (session) {
    redirect("/dashboard")
  }

  return <HomeRedirector />
}
