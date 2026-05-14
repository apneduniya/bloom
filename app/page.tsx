"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LandingNav } from "@/components/layout/landing-nav";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { FeatureBand } from "@/features/home/components/feature-band";
import { LandingHero } from "@/features/home/components/landing-hero";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentUserQuery = useCurrentUser();

  const isHomePage = searchParams.get("home") === "true";

  useEffect(() => {
    if (isHomePage) return;
    if (currentUserQuery.isFetched && currentUserQuery.data) {
      router.replace("/dashboard");
    }
  }, [currentUserQuery.isFetched, currentUserQuery.data, isHomePage, router]);

  return (
    <main className="landing-page">
      <LandingNav />
      <LandingHero />
      <FeatureBand />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
