import { Link } from "react-router-dom";
import Nav from "../components/Nav";

/**
 * Catch-all for unknown URLs.
 *
 * Wears the marketing site's palette rather than the members theme: someone
 * who mistypes a URL is far more likely to be a visitor than a signed-in
 * member, and this is the one screen that has to make sense to a stranger.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-slate">404</p>
        <h1 className="mt-5 font-display text-4xl font-semibold text-graphite sm:text-5xl">
          That page doesn't exist
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate">
          The link may be out of date, or the page may have moved. Everything the club
          publishes is on the home page.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
          >
            Back to the home page
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full border border-hairline-strong px-5 py-2.5 text-sm font-semibold text-graphite transition hover:border-graphite"
          >
            Go to the members area
          </Link>
        </div>
      </main>
    </div>
  );
}
