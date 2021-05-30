import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
export default function stars(req: VercelRequest, res: VercelResponse) {
  res.send(
    `<script>window.localStorage.setItem("token", "${req.query.access_token}")</script>` +
      `<p>API token saved locally: ${req.query.access_token}` +
      '<p>Go back to <a href="/">home page</a>.</p>'
  );
}
