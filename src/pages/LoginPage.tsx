import { Link } from "react-router-dom";
import { FloatingPaths } from "../components/ui/background-paths";
import clubLogo from "../assets/club-logo-transparent.png";

/**
 * Uses the `login-*` colour tokens rather than the shared canvas/surface
 * ones, so this screen keeps its warm palette and stays visually put when
 * the content sections' theme is retuned.
 */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-login-bg px-6">
      <div className="absolute inset-0 text-login-text">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={clubLogo}
            alt="C2C logo"
            className="h-16 w-16 rounded-full border border-login-faint object-contain p-1 invert"
          />
          <h1 className="mt-4 font-display text-2xl font-semibold text-login-text">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-login-muted">
            Sign in with your college email to compete.
          </p>
        </div>

        <form className="space-y-4 rounded-2xl border border-login-line bg-login-surface/90 p-6 shadow-lg backdrop-blur-md">
          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-login-muted">
              College Email
            </label>
            <input
              type="email"
              placeholder="you@college.edu"
              className="w-full rounded-lg border border-login-line bg-transparent px-3 py-2 text-login-text placeholder:text-login-faint focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-login-muted">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-login-line bg-transparent px-3 py-2 text-login-text placeholder:text-login-faint focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark"
          >
            Log In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-login-muted">
          <Link to="/" className="hover:text-login-text">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
