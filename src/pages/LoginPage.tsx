import { Link } from "react-router-dom";
import clubLogo from "../assets/club-logo-transparent.png";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={clubLogo}
            alt="C2C logo"
            className="h-16 w-16 rounded-full border border-hairline-strong object-contain p-1 invert"
          />
          <h1 className="mt-4 font-display text-2xl font-semibold text-graphite">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate">
            Sign in with your college email to compete.
          </p>
        </div>

        <form className="space-y-4 rounded-2xl border border-hairline bg-canvas p-6">
          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-slate">
              College Email
            </label>
            <input
              type="email"
              placeholder="you@college.edu"
              className="w-full rounded-lg border border-hairline bg-transparent px-3 py-2 text-graphite placeholder:text-hairline-strong focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-slate">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-hairline bg-transparent px-3 py-2 text-graphite placeholder:text-hairline-strong focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark"
          >
            Log In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate">
          <Link to="/" className="hover:text-graphite">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
