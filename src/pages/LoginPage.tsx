import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { FloatingPaths } from "../components/ui/background-paths";
import clubLogo from "../assets/club-logo-transparent.png";
import { auth } from "../lib/firebase";

const COLLEGE_EMAIL_DOMAIN = "svce.ac.in";

/**
 * Uses the `login-*` colour tokens rather than the shared canvas/surface
 * ones, so this screen keeps its warm palette and stays visually put when
 * the content sections' theme is retuned.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Hints Google's account picker toward the college Workspace domain —
      // not a security boundary on its own, so we re-check the email below.
      provider.setCustomParameters({ hd: COLLEGE_EMAIL_DOMAIN });

      const result = await signInWithPopup(auth, provider);
      const email = result.user.email ?? "";
      if (!email.toLowerCase().endsWith(`@${COLLEGE_EMAIL_DOMAIN}`)) {
        await signOut(auth);
        setError(`Please sign in with your college email (@${COLLEGE_EMAIL_DOMAIN}).`);
        return;
      }
      navigate("/welcome");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Something went wrong signing in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

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
            Sign in with your college Google account to compete.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-login-line bg-login-surface/90 p-6 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-login-line bg-white py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <FcGoogle className="h-5 w-5" />
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <p className="text-center font-mono text-xs uppercase tracking-wider text-login-muted">
            Only @{COLLEGE_EMAIL_DOMAIN} accounts
          </p>

          {error && (
            <p role="alert" className="text-center text-sm text-red-500">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-login-muted">
          <Link to="/" className="hover:text-login-text">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
