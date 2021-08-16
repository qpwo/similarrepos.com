
import { hydrate, prerender as ssr } from 'preact-iso'
import { useState, useEffect } from 'preact/hooks'
import localForage from 'localforage'

export function App() {
	const [x, setX] = useState(0)
	useEffect(() => { localForage.getItem('x').then(x => setX(x as number)) }, [])
	useEffect(() => { if (x > 0) localForage.setItem('x', x) }, [x])
	return <div class="app">
		<button onClick={() => setX(x => x + 1)}>Inc</button>
		<div>x is {x}</div>
	</div>
}

hydrate(<App />)

export async function prerender() {
	return await ssr(<App />)
}
