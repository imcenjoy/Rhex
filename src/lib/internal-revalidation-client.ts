import "server-only"

import { getConfiguredSiteOrigin } from "@/lib/site-origin-config"

type InternalRevalidationPayload =
  | { type: "check-in"; userId: number }
  | { type: "approved-post"; postId: string; postSlug: string; boardSlug?: string | null; authorId: number }
  | { type: "approved-comment"; postId: string; postSlug?: string | null; boardSlug?: string | null; authorId: number }

function getInternalSecret() {
  return process.env.INTERNAL_REVALIDATION_SECRET?.trim()
    || process.env.SESSION_SECRET?.trim()
    || ""
}

export async function requestInternalContentRevalidation(payload: InternalRevalidationPayload) {
  const origin = getConfiguredSiteOrigin()
  const secret = getInternalSecret()

  if (!origin || !secret) {
    return false
  }

  const response = await fetch(new URL("/api/internal/revalidate-content", `${origin}/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-revalidation-secret": secret,
    },
    body: JSON.stringify(payload),
  })

  return response.ok
}
