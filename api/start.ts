import qs from "querystring";
import randomString from "randomstring";

const redirect_uri = process.env.HOST + "/redirect";

function start() {
  return (req, res) => {
    req.session.csrf_string = randomString.generate();
    const githubAuthUrl =
      "https://github.com/login/oauth/authorize?" +
      qs.stringify({
        client_id: process.env.CLIENT_ID,
        redirect_uri: redirect_uri,
        state: req.session.csrf_string,
        scope: "user:email",
      });
    res.redirect(githubAuthUrl);
  };
}

export default start;
