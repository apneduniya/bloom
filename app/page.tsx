"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LandingNav } from "@/components/layout/landing-nav";
import { FeatureBand } from "@/components/section/feature-band";
import { LandingHero } from "@/components/section/landing-hero";
import { useCurrentUserQuery } from "@/lib/appwrite/query-hooks";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentUserQuery = useCurrentUserQuery();

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
