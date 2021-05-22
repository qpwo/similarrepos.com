import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import jwt from "jwt-simple";
import qs from "querystring";
import { redirect_uri } from "./login";

export default function redirect(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code;
  // const returnedState = req.query.state;
  if (jwt.decode(req.query.state as string, process.env.JWT_SECRET!).valid) {
    axios
      .post(
        "https://github.com/login/oauth/access_token?" +
          qs.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri,
            state: req.query.state,
          }),
        {}
      )
      .then((response) => {
        const access_token = qs.parse(response.data).access_token;
        console.log("response.data:", response.data);
        res.redirect("/api/user?" + qs.stringify({ access_token }));
      })
      .catch((err) => console.error(err));
  } else {
    res.redirect("/");
  }
}
