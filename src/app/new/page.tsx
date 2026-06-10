import type { Metadata } from "next"

import { generateHomeFeedMetadata, HomeFeedPage } from "@/app/home-feed-page"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return generateHomeFeedMetadata("new")
}

export default async function NewPage() {
  return <HomeFeedPage sort="new" />
}
