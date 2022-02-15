import {
    ErrorBoundary,
    hydrate,
    lazy,
    LocationProvider,
    prerender as ssr,
    Route,
    Router,
} from 'preact-iso'

import Header from './header.js'
import NotFound from './pages/_404.js'
import Home from './pages/home/index.js'

const About = lazy(() => import('./pages/about/index.js'))

export function App() {
    return <LocationProvider>
        <div class='app'>
            <Header />
            <ErrorBoundary>
                <Router>
                    <Route path='/' component={Home} />
                    <Route path='/about' component={About} />
                    <Route default component={NotFound} />
                </Router>
            </ErrorBoundary>
        </div>
    </LocationProvider>
}

hydrate(<App />)

export async function prerender(data) {
    return await ssr(<App {...data} />)
}
