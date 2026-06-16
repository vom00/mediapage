import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
      <ProfileView handle={handle.toLowerCase()} />
    </div>
  );
}
