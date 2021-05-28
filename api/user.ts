import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default function user(req: VercelRequest, res: VercelResponse) {
  axios
    .get("https://api.github.com/user/public_emails", {
      headers: {
        Authorization: "token " + req.query.access_token,
        "User-Agent": "Login-App",
      },
    })
    .then((response) => {
      res.send(
        "<p>You're logged in! Here's all your emails on GitHub: </p>" +
          JSON.stringify(response.data) +
          '<p>Go back to <a href="./">log in page</a>.</p>' +
          `<script>window.localStorage.setItem("token", ${req.query.access_token})</script>`
      );
    })
    .catch((err) => console.error(err));
}
