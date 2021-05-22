import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jwt-simple";
import qs from "querystring";
import randomString from "randomstring";

export const redirect_uri = process.env.HOST + "/api/redirect";

export default function login(req: VercelRequest, res: VercelResponse) {
  // const csrf_string = randomString.generate();
  const csrf_string = jwt.encode(
    { valid: true, dump_bits: randomString.generate() },
    process.env.JWT_SECRET!
  );
  const githubAuthUrl =
    "https://github.com/login/oauth/authorize?" +
    qs.stringify({
      client_id: process.env.CLIENT_ID,
      redirect_uri: redirect_uri,
      state: csrf_string,
      scope: "user:email",
    });
  res.redirect(githubAuthUrl);
}
