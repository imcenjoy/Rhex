import "server-only"

import { revalidatePath } from "next/cache"

import { expireContentListCachesImmediately } from "@/lib/content-list-cache"
import { revalidateHomeSidebarStatsCache } from "@/lib/home-sidebar-stats"
import {
  revalidatePostCommentCache,
  revalidatePostDetailCache,
  revalidatePostViewerCache,
} from "@/lib/post-detail-cache"
import { revalidateUserSurfaceCache } from "@/lib/user-surface"

function safeRevalidatePath(path: string, type?: "page" | "layout") {
  try {
    if (type) {
      revalidatePath(path, type)
      return
    }

    revalidatePath(path)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.startsWith("Invariant: static generation store missing in revalidatePath")
      || message.includes('used "revalidatePath ')
    ) {
      return
    }

    throw error
  }
}

export function revalidateCheckInMutation(input: { userId: number }) {
  revalidateUserSurfaceCache(input.userId)
  safeRevalidatePath("/", "layout")
}

export function revalidateApprovedPostMutation(input: {
  postId: string
  postSlug: string
  boardSlug?: string | null
  authorId: number
}) {
  revalidateUserSurfaceCache(input.authorId)
  expireContentListCachesImmediately()
  revalidateHomeSidebarStatsCache()
  revalidatePostDetailCache({ postId: input.postId, slug: input.postSlug })
  safeRevalidatePath("/")
  safeRevalidatePath("/latest")
  safeRevalidatePath("/new")
  safeRevalidatePath("/hot")
  safeRevalidatePath("/following")
  safeRevalidatePath("/settings")
  safeRevalidatePath("/users/[username]", "page")
  safeRevalidatePath("/latest/page/[page]", "page")
  safeRevalidatePath("/new/page/[page]", "page")
  safeRevalidatePath("/hot/page/[page]", "page")
  safeRevalidatePath("/posts/[slug]", "page")
  safeRevalidatePath(`/posts/${input.postSlug}`)

  if (input.boardSlug) {
    safeRevalidatePath(`/boards/${input.boardSlug}`)
  }
}

export function revalidateApprovedCommentMutation(input: {
  postId: string
  postSlug?: string | null
  boardSlug?: string | null
  authorId: number
}) {
  revalidateUserSurfaceCache(input.authorId)
  revalidatePostViewerCache(input.authorId)
  revalidatePostCommentCache({ postId: input.postId, slug: input.postSlug })
  expireContentListCachesImmediately()
  revalidateHomeSidebarStatsCache()
  safeRevalidatePath("/")
  safeRevalidatePath("/latest")
  safeRevalidatePath("/new")
  safeRevalidatePath("/hot")
  safeRevalidatePath("/following")
  safeRevalidatePath("/settings")
  safeRevalidatePath("/users/[username]", "page")
  safeRevalidatePath("/latest/page/[page]", "page")
  safeRevalidatePath("/new/page/[page]", "page")
  safeRevalidatePath("/hot/page/[page]", "page")
  safeRevalidatePath("/posts/[slug]", "page")

  if (input.postSlug) {
    safeRevalidatePath(`/posts/${input.postSlug}`)
  }

  if (input.boardSlug) {
    safeRevalidatePath(`/boards/${input.boardSlug}`)
  }
}
