import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const CREATOR_HOSTS = new Set(["creators.epocheye.com", "creators.epocheye.app"])
const PUBLIC_FILE = /\.[^/]+$/

const isCreatorsDashboardRoute = createRouteMatcher(["/creators/dashboard(.*)"])
const isCreatorsSubdomainDashboardRoute = createRouteMatcher(["/dashboard(.*)"])

const normalizeHost = (req) => {
  const forwardedHost = req.headers.get("x-forwarded-host")
  const host = forwardedHost || req.headers.get("host") || ""
  return host.toLowerCase().split(":")[0]
}

const shouldSkipRewrite = (pathname) => {
  return (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/trpc") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  )
}

const toCreatorsPathname = (pathname) => {
  if (pathname === "/") return "/creators"
  if (pathname.startsWith("/creators")) return pathname
  return `/creators${pathname}`
}

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname
  const host = normalizeHost(req)
  const isCreatorsHost = CREATOR_HOSTS.has(host)

  const shouldProtectDashboard =
    isCreatorsDashboardRoute(req) ||
    (isCreatorsHost && isCreatorsSubdomainDashboardRoute(req))

  if (shouldProtectDashboard) {
    await auth.protect()
  }

  if (!isCreatorsHost || shouldSkipRewrite(pathname)) {
    return NextResponse.next()
  }

  const rewrittenPathname = toCreatorsPathname(pathname)

  if (rewrittenPathname === pathname) {
    return NextResponse.next()
  }

  const rewriteUrl = req.nextUrl.clone()
  rewriteUrl.pathname = rewrittenPathname

  return NextResponse.rewrite(rewriteUrl)
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
