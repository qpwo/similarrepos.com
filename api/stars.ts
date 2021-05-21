import axios from "axios";
import { query } from "./main";

export const stars = (req, res) => {
  axios
    .post(
      "https://api.github.com/graphql",
      { query: query },
      {
        headers: {
          Authorization: "token " + req.session.access_token,
          "User-Agent": "Login-App",
        },
      }
    )
    .then((response) => {
      res.send(
        "<p>Response from graqhql: </p>" +
          JSON.stringify(response.data) +
          '<p>Go back to <a href="./">log in page</a>.</p>'
      );
    });
};
