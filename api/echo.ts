import { VercelRequest, VercelResponse } from "@vercel/node";

export default function echo(req: VercelRequest, res: VercelResponse) {
  res.json({
    body: req.body,
    query: req.query,
    cookies: req.cookies,
    // foo: req.
  });
}
