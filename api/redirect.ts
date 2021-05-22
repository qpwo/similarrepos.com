import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import qs from "querystring";
import jwt from "jwt-simple";

const redirect_uri = process.env.HOST + "/api/redirect";

export default function redirect(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code;
  // const returnedState = req.query.state;
  if (jwt.decode(req.body.csrf_string, process.env.JWT_SECRET).valid) {
    axios
      .post(
        "https://github.com/login/oauth/access_token?" +
          qs.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri,
            state: req.body.csrf_string,
          }),
        {}
      )
      .then((response) => {
        const access_token = qs.parse(response.data).access_token;
        res.redirect("/user?" + qs.stringify({ access_token }));
      });
  } else {
    res.redirect("/");
  }
}
