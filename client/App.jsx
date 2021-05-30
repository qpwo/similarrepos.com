export default function App() {
    return <div>
        <h1> SimilarRepos (<a href="https://github.com/qpwo/similarrepos">GH</a>) </h1>
        <h2>Seriously alpha quality</h2>
        <p><i>Find similar/related repositories on github using co-stars, like Yasiv's ghindex but with graphql api that doesn't eat your query limit.</i></p>
        <div id="loginHolder" />
        <div>
            <input type="text" id="repo" placeholder="someuser/theirrepo" />
            <button type="button" onclick="doRepo()">
                Find similar repositories
            </button>
            (check js console logs for progress)
            <div id="allStars" />
            <div>
                Similar Repos:
              <div id="similar" />
            </div>
        </div>
        <div>
            Remaining queries:
            <div id="remainingQueries" />
        </div>
        <div style={{ visibility: 'hidden' }}>
            <button onclick="location.href='/api/login'" type="button" id="loginButton" style={{ backgroundColor: 'greenyellow' }}>
                Get API token from GitHub
            </button>
            <button type="button" onclick="logout()" id="logoutButton">
                Log out
            </button>
        </div>
    </div>
}


