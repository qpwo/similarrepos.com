import { VercelRequest, VercelResponse } from "@vercel/node";
// import qs from "querystring";
// import randomString from "randomstring";

const redirect_uri = process.env.HOST + "/echo";

export default function start(req: VercelRequest, res: VercelResponse) {
  const csrf_string = randomString.generate();
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
