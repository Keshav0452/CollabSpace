
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import "./Auth.css";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Return to the page the user originally wanted (e.g. an invite link).
  const fromState = (location.state as { from?: string } | null)?.from;
  const redirectTo =
    fromState && fromState.startsWith("/") && !fromState.startsWith("//")
      ? fromState
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand">
          <div className="auth-brand-mark">C</div>
          <span>CollabSpace</span>
        </div>

        <div className="auth-visual-content">
          <h2>Great work happens together.</h2>
          <p>
            Bring your team, projects, and tasks together in one
            organized workspace. Focus on what matters and make
            progress together.
          </p>
        </div>

        <div className="auth-visual-footer">
          Your team's workspace, all in one place.
        </div>

        <div className="auth-decoration" />
      </section>

      <section className="auth-form-section">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <div className="auth-brand-mark">C</div>
            <span>CollabSpace</span>
          </div>

          <div className="auth-heading">
            <h1>Welcome back</h1>
            <p>
              Enter your account details to access your workspace.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/register" state={location.state}>Create an account</Link>
          </p>

          <p className="auth-bottom-note">
            © 2026 CollabSpace. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
