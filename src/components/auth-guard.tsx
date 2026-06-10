"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requireLoginToView: boolean
  isLoggedIn: boolean
}

export function AuthGuard({ children, requireLoginToView, isLoggedIn }: AuthGuardProps) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!requireLoginToView) return
    if (isLoggedIn) return
    // 放行登录/注册等公开页面
    if (
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/auth/complete") ||
      pathname.startsWith("/auth/passkey") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon")
    ) return

    const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`
    router.replace(loginUrl)
  }, [requireLoginToView, isLoggedIn, pathname, router])

  return <>{children}</>
}
