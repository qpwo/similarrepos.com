import axios from "axios";

export const user = (req, res) => {
  axios
    .get("https://api.github.com/user/public_emails", {
      headers: {
        Authorization: "token " + req.session.access_token,
        "User-Agent": "Login-App",
      },
    })
    .then((response) => {
      res.send(
        "<p>You're logged in! Here's all your emails on GitHub: </p>" +
          JSON.stringify(response.data) +
          '<p>Go back to <a href="./">log in page</a>.</p>'
      );
    });
};
