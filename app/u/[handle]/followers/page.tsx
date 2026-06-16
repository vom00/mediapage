import type { Metadata } from "next";
import { FollowList } from "@/components/follow-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `Followers of @${handle}` };
}

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <FollowList handle={handle.toLowerCase()} kind="followers" />;
}
