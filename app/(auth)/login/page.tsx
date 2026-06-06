import Link from 'next/link'
import { LoginForm } from './LoginForm'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Sign in to Focusly</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
