
import { hydrate, prerender as ssr } from 'preact-iso'
import { useState, useEffect } from 'preact/hooks'
import localForage from 'localforage'
import { doRepo } from './script'


export function App() {
	return <>
		<Header />
		<LoginArea />
		<Similar />
		<Remaining />
	</>
}


function Header() {
	return <>
		<h1>SimilarRepos (<a href="https://github.com/qpwo/similarrepos">GH</a>)</h1>
		<h2>Seriously alpha quality</h2>
		<p><i>Find similar/related repositories on github using co-stars, like Yasiv's ghindex but with graphql api that doesn't eat your query limit.</i></p>
	</>
}


function LoginArea() {
	return <div id="loginHolder">
		<button
			onClick={() => { location.href = '/api/login' }}
			style="background-color: greenyellow"
		>
			Get API token from GitHub
		</button>

		<button>Log out</button>
	</div>

}


function Similar() {
	return <div>
		<input type="text" id="repo" placeholder="someuser/theirrepo" />
		<button id="doRepo" onClick={doRepo}>Find similar repositories</button>
		(click it again if you get an error as it goes)
		<p id="status">Status:</p>

		<div>
			Similar Repos:
			<div id="similar"></div>
		</div>
	</div>
}


function Remaining() {
	return <div>
		Remaining queries:
		<div id="remainingQueries"></div>
	</div>
}


hydrate(<App />)


export async function prerender() {
	return await ssr(<App />)
}
