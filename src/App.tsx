import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ThemeProvider } from "./lib/ThemeContext";

/**
 * Everything except the landing page is lazily loaded.
 *
 * The whole app used to ship as one 1.24MB chunk, which meant a visitor who
 * opened the home page on mobile data downloaded the members dashboard, the
 * charts, Firebase Auth and the entire admin panel — including the image
 * cropper — before they could read the first sentence. HomePage stays eager
 * because it *is* the first paint; splitting it would only add a round trip.
 *
 * Grouped deliberately: the members screens land in chunks of their own, and
 * the admin screens in theirs, so an ordinary member never pays for admin code
 * either.
 */
const LoginPage = lazy(() => import("./pages/LoginPage"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));

const MembersLayout = lazy(() => import("./components/members/MembersLayout"));
const Dashboard = lazy(() => import("./pages/members/Dashboard"));
const Profile = lazy(() => import("./pages/members/Profile"));
const WeeklyChallenges = lazy(() => import("./pages/members/WeeklyChallenges"));
const Leaderboard = lazy(() => import("./pages/members/Leaderboard"));

const AdminLayout = lazy(() => import("./components/members/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/members/admin/AdminOverview"));
const AdminMembers = lazy(() => import("./pages/members/admin/AdminMembers"));
const AdminChallenges = lazy(() => import("./pages/members/admin/AdminChallenges"));
const AdminAnnouncements = lazy(() => import("./pages/members/admin/AdminAnnouncements"));
const AdminBadges = lazy(() => import("./pages/members/admin/AdminBadges"));
const AdminEvents = lazy(() => import("./pages/members/admin/AdminEvents"));
const AdminBoard = lazy(() => import("./pages/members/admin/AdminBoard"));
const AdminBlog = lazy(() => import("./pages/members/admin/AdminBlog"));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ children }: { children: ReactNode }) {
  const { user, loading, role, docLoading } = useAuth();
  // Must wait on docLoading too — bouncing a genuine admin to /dashboard on
  // the first paint (before their role has loaded) would be a real bug,
  // not just a flash.
  if (loading || docLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin" && role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Deliberately blank rather than a spinner: chunks resolve in
              milliseconds on any warm connection, and a flashed spinner reads
              as jank where nothing reads as instant. */}
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/blog/:postId" element={<BlogPost />} />

              {/* Not a screen of its own any more — it arms the welcome curtain
                  and hands straight to the dashboard, which then renders behind
                  it. Kept as a route so the login page and the site nav have one
                  stable "into the members area" URL to point at. */}
              <Route
                path="/welcome"
                element={<Navigate to="/dashboard" replace state={{ welcome: true }} />}
              />

              <Route
                element={
                  <RequireAuth>
                    <MembersLayout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/challenges" element={<WeeklyChallenges />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                {/* Admin section — one role gate on the layout covers every
                    child route, so a new admin page can't accidentally ship
                    unguarded. */}
                <Route
                  path="/admin"
                  element={
                    <RequireRole>
                      <AdminLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="members" element={<AdminMembers />} />
                  <Route path="challenges" element={<AdminChallenges />} />
                  <Route path="announcements" element={<AdminAnnouncements />} />
                  <Route path="badges" element={<AdminBadges />} />
                  {/* Public-site content — same role gate, different audience. */}
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="board" element={<AdminBoard />} />
                  <Route path="blog" element={<AdminBlog />} />
                </Route>
              </Route>

              {/* Must stay last — it matches anything the routes above didn't. */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
