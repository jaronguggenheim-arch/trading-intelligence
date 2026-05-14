// app/page.tsx — Root redirect to morning brief
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/morning-brief')
}
