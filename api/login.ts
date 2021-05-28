import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jwt-simple";
import qs from "querystring";

export const redirect_uri = process.env.HOST + "/api/redirect";

function randomString(): string {
  return Math.random().toString(36).substring(2);
}

export default function login(req: VercelRequest, res: VercelResponse) {
  const csrf_string = jwt.encode(
    { valid: true, dump_bits: randomString() },
    process.env.JWT_SECRET!
  );
  const githubAuthUrl =
    "https://github.com/login/oauth/authorize?" +
    qs.stringify({
      client_id: process.env.CLIENT_ID,
      redirect_uri: redirect_uri,
      state: csrf_string,
      // scope: "user:email",
    });
  res.redirect(githubAuthUrl);
}
