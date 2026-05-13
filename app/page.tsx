import Link from "next/link";
import { HomeAuthCta } from "@/components/home-auth-cta";
import { UploadCreate } from "@/features/blooms/upload-create";

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">B</span>
          Bloom
        </Link>
        <div>
          <Link href="/login">Login</Link>
        </div>
      </nav>

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

      <section className="feature-band">
        <div>
          <h2>DOM editor</h2>
          <p>Fast overlay editing keeps high-frequency drag and resize local while autosave persists stable canvas pixels.</p>
        </div>
        <div>
          <h2>CSV merge tags</h2>
          <p>Preview columns, validate missing tokens, and reuse tags across certificates, recipients, subjects, and bodies.</p>
        </div>
        <div>
          <h2>Queued sending</h2>
          <p>SMTP credentials stay behind the integration boundary and send jobs expose progress plus row-level errors.</p>
        </div>
      </section>
    </main>
  );
}
