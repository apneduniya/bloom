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
  log(`Render certificate requested for bloom ${body.bloomId ?? "unknown"}`);

  return res.json({
    ok: true,
    rendered: false,
    note: "Render certificate stub deployed.",
  });
};

export default handler;
