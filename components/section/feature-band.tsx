const features = [
  {
    title: "DOM editor",
    body: "Fast overlay editing keeps high-frequency drag and resize local while autosave persists stable canvas pixels.",
  },
  {
    title: "CSV merge tags",
    body: "Preview columns, validate missing tokens, and reuse tags across certificates, recipients, subjects, and bodies.",
  },
  {
    title: "Queued sending",
    body: "SMTP credentials stay behind the integration boundary and send jobs expose progress plus row-level errors.",
  },
];

export function FeatureBand() {
  return (
    <section className="feature-band">
      {features.map((feature) => (
        <div key={feature.title}>
          <h2>{feature.title}</h2>
          <p>{feature.body}</p>
        </div>
      ))}
    </section>
  );
}
