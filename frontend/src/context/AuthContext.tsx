
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  getCurrentUser,
  type LoginInput,
  type RegisterInput,
} from "../api/auth.api";

import {
  getAccessToken,
  clearAccessToken,
  AUTH_EXPIRED_EVENT,
} from "../api/client";

const USER_KEY = "collabspace_user";

// The backend's /protected/me only returns the ID, so the name and
// email from login/register are kept locally to show in the UI.
function saveUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function loadSavedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// The backend currently returns only the user ID
// from its /protected/me endpoint.
export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check whether a saved token is still valid
  // whenever the application starts.
  useEffect(() => {
    async function restoreSession() {
      const token = getAccessToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        const saved = loadSavedUser();

        setUser(
          saved && saved.id === currentUser.id
            ? saved
            : currentUser,
        );
      } catch {
        clearAccessToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Log out automatically when the backend rejects the token.
  useEffect(() => {
    function handleExpired() {
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);

    return () =>
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  async function login(input: LoginInput): Promise<void> {
    const result = await loginApi(input);
    saveUser(result.user);
    setUser(result.user);
  }

  async function register(input: RegisterInput): Promise<void> {
    const result = await registerApi(input);
    saveUser(result.user);
    setUser(result.user);
  }

  function updateUser(updatedUser: AuthUser): void {
    saveUser(updatedUser);
    setUser(updatedUser);
  }

  function logout(): void {
    logoutApi();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider",
    );
  }

  return context;
}
