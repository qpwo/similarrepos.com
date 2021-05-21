import axios from "axios";
import qs from "querystring";

const redirect_uri = process.env.HOST + "/redirect";

export const redirect = (req, res) => {
  const code = req.query.code;
  const returnedState = req.query.state;
  if (req.session.csrf_string === returnedState) {
    axios
      .post(
        "https://github.com/login/oauth/access_token?" +
          qs.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri,
            state: req.session.csrf_string,
          }),
        {}
      )
      .then((response) => {
        req.session.access_token = qs.parse(response.data).access_token;

        res.redirect("/user");
      });
  } else {
    res.redirect("/");
  }
};
