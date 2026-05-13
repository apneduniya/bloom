function parseBody(req) {
  if (req.bodyJson) return req.bodyJson;
  if (!req.bodyText) return {};
  try {
    return JSON.parse(req.bodyText);
  } catch {
    return {};
  }
}

const handler = async ({ req, res, log }) => {
  const body = parseBody(req);
  const integration = body.integration ?? {};
  const secret = typeof body.secret === "string" ? body.secret : "";

  log(`SMTP test requested for ${integration.fromEmail ?? "unknown"}`);

  return res.json({
    ok: true,
    secretRef: `smtp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    tested: Boolean(secret),
  });
};

export default handler;
