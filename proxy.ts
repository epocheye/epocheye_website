import { clerkMiddleware } from "@clerk/nextjs/server"

export default clerkMiddleware()

// Clerk only backs the creator API routes (getCreatorContext -> auth()).
// Marketing pages and the admin portal (separate JWT) must NOT invoke Clerk,
// so a Clerk/domain outage can never break the homepage.
export const config = {
  matcher: ["/api/creator/:path*"],
}
