import type { Metadata } from "next"

import { generateHomeFeedMetadata, HomeFeedPage } from "@/app/home-feed-page"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return generateHomeFeedMetadata("latest")
}

export default async function LatestPage() {
  return <HomeFeedPage sort="latest" />
}
