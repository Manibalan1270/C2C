import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
import { ensureUserDoc } from "./userDoc";
import { subscribeToUserDoc } from "./queries/users";
import type { UserDoc, UserRole } from "../types/schema";

interface AuthState {
  user: User | null;
  userDoc: UserDoc | null;
  /** Derived from userDoc.role — kept as its own field because it's the
   *  most common thing consumers need and "role only" is a much smaller
   *  dependency to read than the whole doc. */
  role: UserRole | null;
  /** "Auth has resolved" — true only until Firebase Auth reports whether
   *  anyone is signed in. RequireAuth (App.tsx) gates on this alone.
   *  Deliberately NOT widened to also mean "profile doc has loaded" — a
   *  Firestore hiccup must not blank the entire members area, which is
   *  exactly the failure ensureUserDoc's error-swallowing exists to avoid. */
  loading: boolean;
  /** First user-doc snapshot still pending, separate from `loading` above. */
  docLoading: boolean;
  docError: Error | null;
}

const initialState: AuthState = {
  user: null,
  userDoc: null,
  role: null,
  loading: true,
  docLoading: true,
  docError: null,
};

const AuthContext = createContext<AuthState>(initialState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    // Guards against a slow ensureUserDoc() from a previous user resolving
    // after a newer auth-state change has already fired — without this, a
    // fast sign-out/sign-in (or React StrictMode's double-invoke in dev)
    // can apply a stale write to the current state.
    let generation = 0;
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      generation += 1;
      const myGeneration = generation;

      unsubscribeDoc?.();
      unsubscribeDoc = null;

      if (!user) {
        setState({
          user: null,
          userDoc: null,
          role: null,
          loading: false,
          docLoading: false,
          docError: null,
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        user,
        loading: false,
        docLoading: true,
        docError: null,
      }));

      void ensureUserDoc(user).then(() => {
        if (myGeneration !== generation) return; // superseded — drop it

        unsubscribeDoc = subscribeToUserDoc(
          user.uid,
          (userDoc) => {
            if (myGeneration !== generation) return;
            setState((prev) => ({
              ...prev,
              userDoc,
              role: userDoc?.role ?? null,
              docLoading: false,
              docError: null,
            }));
          },
          (err) => {
            if (myGeneration !== generation) return;
            console.error("User profile subscription failed:", err);
            setState((prev) => ({ ...prev, docLoading: false, docError: err }));
          },
        );
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc?.();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
