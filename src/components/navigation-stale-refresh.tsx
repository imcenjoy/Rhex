"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

const MUTATION_MARKER_KEY = "rhex:content-mutated-at"

function readMutationMarker() {
  const raw = window.sessionStorage.getItem(MUTATION_MARKER_KEY)
  const value = raw ? Number(raw) : 0
  return Number.isFinite(value) ? value : 0
}

export function NavigationStaleRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const handledMarkersByPathRef = useRef(new Map<string, number>())

  useEffect(() => {
    const marker = readMutationMarker()
    if (!marker) {
      return
    }

    const handledMarker = handledMarkersByPathRef.current.get(pathname) ?? 0
    if (handledMarker === marker) {
      return
    }

    handledMarkersByPathRef.current.set(pathname, marker)
    router.refresh()
  }, [pathname, router])

  useEffect(() => {
    function refreshIfNeeded(force = false) {
      const marker = readMutationMarker()
      const currentPath = window.location.pathname
      const handledMarker = handledMarkersByPathRef.current.get(currentPath) ?? 0
      if (!marker || (!force && marker === handledMarker)) {
        return
      }

      handledMarkersByPathRef.current.set(currentPath, marker)
      router.refresh()
    }

    function handlePageShow(event: PageTransitionEvent) {
      refreshIfNeeded(event.persisted)
    }

    function handleFocus() {
      refreshIfNeeded()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshIfNeeded()
      }
    }

    window.addEventListener("pageshow", handlePageShow)
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("pageshow", handlePageShow)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router])

  return null
}
