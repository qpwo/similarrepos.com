import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const query = `{
  user(login: "qpwo") {
    starredRepositories(first: 100, after: "") {
      edges {
        cursor
        node {
          nameWithOwner
        }
      }
    }
  }
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
}`;

export default function stars(req: VercelRequest, res: VercelResponse) {
  axios
    .post(
      "https://api.github.com/graphql",
      { query: query },
      {
        headers: {
          Authorization: "token " + req.query.access_token,
        },
      }
    )
    .then((response) => {
      res.send(
        "<p>Response from graqhql: </p>" +
          JSON.stringify(response.data) +
          '<p>Go back to <a href="/">log in page</a>.</p>' +
          `<script>window.localStorage.setItem("token", "${req.query.access_token}")</script>`
      );
    });
}
