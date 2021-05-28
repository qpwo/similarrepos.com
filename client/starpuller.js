const token = localStorage.getItem("token")

function make_uid() {
    return Math.random().toString(36).substring(7)
}

function repoQuery(repo, alias = "", cursor = "") {
    const [owner, name] = repo.split("/")
    if (cursor) { cursor = `, after: "${cursor}"` }
    if (alias) { alias = `${alias}: ` }
    return `${alias}repository(owner: "${owner}", name: "${name}") { stargazers(first: 100${cursor}) { edges { cursor node { login } } } }`
}

function userQuery(user, alias = "", cursor = "") {
    if (cursor) { cursor = `, after: "${cursor}"` }
    if (alias) { alias = `${alias}: ` }
    return `${alias}user(login: "${user}") { starredRepositories(first: 100${cursor}) { edges { cursor node { nameWithOwner } } } }`
}


async function run_query(query) {
    const response = await fetch("https://api.github.com/graphql", {
        method: 'POST',
        body: JSON.stringify({ query: query }),
        headers: {
            Authorization: "token " + token,
        }
    })
    const json = await response.json()
    return json
}
