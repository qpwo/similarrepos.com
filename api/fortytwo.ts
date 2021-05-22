import { VercelRequest, VercelResponse } from "@vercel/node";

export default function fortytwo(req: VercelRequest, res: VercelResponse) {
  res.status(200).send({ fortytwo: 42 });
}
