import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login page as default behavior
  redirect('/login')
}
