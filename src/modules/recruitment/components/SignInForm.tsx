"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { BUTTON_PRIMARY, INPUT } from "@/shared/ui";
import { signIn, verifyCode, type SignInState } from "../actions";

/** Email and password, then the code OpsAPI emails (when the workspace asks for one). */
export function SignInForm({ next }: { next: string }) {
  const [state, action] = useFormState(signIn, { step: "password" } as SignInState);
  if (state.step === "code") return <CodeForm email={state.email} />;
  return (
    <form action={action} className="grid gap-4">
      <ErrorNote message={state.error} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={INPUT} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={INPUT} />
      </div>
      <div>
        <Submit idle="Sign in" busy="Signing in…" />
      </div>
    </form>
  );
}

function CodeForm({ email }: { email: string }) {
  const [state, action] = useFormState(verifyCode, { step: "code", email } as SignInState);
  if (state.step === "password") {
    return (
      <div className="grid gap-4">
        <ErrorNote message={state.error} />
        <Link href="/recruiters/sign-in" className={BUTTON_PRIMARY + " justify-self-start"}>
          Start again
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <p className="text-body">We&rsquo;ve emailed a sign-in code to {email}. It expires in a few minutes.</p>
      <ErrorNote message={state.error} />
      <div>
        <label htmlFor="code" className="text-sm font-medium text-ink">
          Sign-in code
        </label>
        <input id="code" name="code" inputMode="text" autoComplete="one-time-code" required autoFocus className={INPUT} />
      </div>
      <div>
        <Submit idle="Continue" busy="Checking…" />
      </div>
    </form>
  );
}

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
      {message}
    </p>
  );
}

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
      {pending ? busy : idle}
    </button>
  );
}
