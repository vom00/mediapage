import type { Metadata } from "next";
import { FollowList } from "@/components/follow-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle} follows` };
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <FollowList handle={handle.toLowerCase()} kind="following" />;
}
