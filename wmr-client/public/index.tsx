
import { hydrate, prerender as ssr } from 'preact-iso'
import { useState } from 'preact/hooks'

export function App() {
	const [x, setX] = useState(0)
	return <div class="app">
		<button onClick={() => setX(x => x + 1)}>Inc</button>
		<div>x is {x}</div>
	</div>

}

hydrate(<App />)

export async function prerender() {
	return await ssr(<App />)
}
