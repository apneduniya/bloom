import { UploadCreate } from "@/features/blooms/components/upload-create";
import { HomeAuthCta } from "@/features/home/components/home-auth-cta";

export function LandingHero() {
  return (
    <section className="landing-hero">
      <div className="hero-copy">
        <p className="eyebrow">Certificate campaigns</p>
        <h1>Bloom</h1>
        <p>
          Upload a certificate PNG, place merge-tagged text, personalize from CSV rows, export crisp PNGs, and queue
          SMTP email sends with per-recipient tracking.
        </p>
        <div className="hero-actions">
          <UploadCreate compact />
          <HomeAuthCta />
        </div>
      </div>
      <div className="hero-certificate" aria-hidden="true">
        <div className="cert-paper">
          <span>Certificate of Completion</span>
          <strong>{"{{name}}"}</strong>
          <small>Presented by Bloom</small>
        </div>
      </div>
    </section>
  );
}
