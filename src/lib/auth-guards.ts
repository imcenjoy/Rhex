import { NextResponse, type NextRequest } from "next/server"

import { getRequestIp } from "@/lib/request-ip"
import { getSessionCookieName, parseSessionToken } from "@/lib/session"

/** 公开的页面路径（无需登录） */
const PUBLIC_PAGE_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth",
]

/** 公开的 API 路径前缀（无需登录） */
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/verify-code",
  "/api/auth/send-verification-code",
  "/api/auth/pow",
  "/api/auth/captcha",
  "/api/auth/passkey",
  "/api/auth/oauth",
  "/api/auth/external",
  "/api/auth/addon-external",
  "/api/auth/complete",
  "/api/internal/revalidate-content",
]

function isPublicPagePath(pathname: string) {
  return PUBLIC_PAGE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
}

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isProtectedPath(pathname: string) {
  // API 路径
  if (pathname.startsWith("/api/")) {
    return !isPublicApiPath(pathname)
  }

  // 页面路径：公开的登录/注册等放行，其余全部保护
  return !isPublicPagePath(pathname)
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value
  return await parseSessionToken(token, {
    requestIp: getRequestIp(request),
  })
}

export function buildUnauthorizedResponse(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 })
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("redirect", `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}
