import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../app/AuthProvider";
import { ROUTES } from "../constants/domain";
import { authApi } from "../services/api";
import { Button, Field, Message } from "../components/ui";
import { configured } from "../lib/supabase/client";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const signup = mode === "signup";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (signup) {
        const active = await signUp(email, password);
        if (active) navigate(ROUTES.onboarding);
        else
          setNotice("Check your email to confirm your account, then sign in.");
      } else {
        await signIn(email, password);
        navigate(ROUTES.dashboard);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not continue. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-intro">
        <div className="brand brand-light">
          <span className="brand-mark">
            <LockKeyhole size={17} strokeWidth={2.2} />
          </span>
          LockIn<span className="brand-period">.</span>
        </div>
        <div>
          <h1>
            Twenty-one days.
            <br />
            One promise to yourself.
          </h1>
          <p>Choose your habits. Make the commitment. Show up today.</p>
        </div>
        <div className="auth-timeline" aria-hidden="true">
          {Array.from({ length: 21 }, (_, i) => (
            <span key={i} className={i < 7 ? "lit" : ""} />
          ))}
        </div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-mobile-brand brand">
            <span className="brand-mark">
              <LockKeyhole size={17} strokeWidth={2.2} />
            </span>
            LockIn<span className="brand-period">.</span>
          </div>
          <h2>{signup ? "Create your account" : "Welcome back"}</h2>
          <p>
            {signup
              ? "A fresh start begins with one decision."
              : "Your commitment is waiting for you."}
          </p>
          {!configured && (
            <Message tone="warning">
              Connect Supabase in your .env file to use this app.
            </Message>
          )}
          <Field
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            minLength={6}
            autoComplete={signup ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <Message tone="error">{error}</Message>}
          {notice && <Message tone="success">{notice}</Message>}
          <Button type="submit" disabled={busy || !configured}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </Button>
          <div className="auth-switch">
            {signup ? "Already have an account?" : "New to LockIn?"}{" "}
            <Link to={signup ? ROUTES.login : ROUTES.signup}>
              {signup ? "Sign in" : "Create account"}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authApi.updateProfile(name, true);
      await refreshProfile();
      navigate(ROUTES.dashboard);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your name.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <span className="eyebrow">First things first</span>
        <h1>What should we call you?</h1>
        <p>We’ll use your name to make this space yours.</p>
        <form onSubmit={submit}>
          <Field
            id="name"
            label="Your name"
            placeholder="Your name"
            maxLength={60}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {error && <Message tone="error">{error}</Message>}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Continue to dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
