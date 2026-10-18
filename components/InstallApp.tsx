"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "bilva-install-dismissed";

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

// compact: a small banner shown only when the browser offers one-tap install.
// full: the Account page section, with steps for every device.
export default function InstallApp({ compact = false }: { compact?: boolean }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInstalled(isInstalled());
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // Private mode: the banner simply shows every time.
    }
    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore: nothing to save in private mode.
    }
  }

  if (installed) {
    return compact ? null : (
      <section className="card stack">
        <h2>Bilva is installed</h2>
        <p className="muted">You are using Bilva as an app on this device.</p>
      </section>
    );
  }

  if (compact) {
    if (!prompt || dismissed) return null;
    return (
      <div className="install-banner">
        <span>Add Bilva to your home screen to open it like an app.</span>
        <span className="row-buttons">
          <button type="button" className="btn btn-primary btn-small" onClick={install}>
            Install
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={dismiss}>
            Not now
          </button>
        </span>
      </div>
    );
  }

  return (
    <section className="card stack">
      <h2>Install Bilva on your phone</h2>
      <p className="muted">
        Add Bilva to your home screen so it opens like an app, with its own icon
        and no browser bar.
      </p>
      {prompt && (
        <div>
          <button type="button" className="btn btn-primary btn-small" onClick={install}>
            Install Bilva
          </button>
        </div>
      )}
      <ul className="list-plain small">
        <li>
          <strong>Android (Chrome):</strong> tap the three dots at the top
          right, then <em>Install app</em> or <em>Add to Home screen</em>.
        </li>
        <li>
          <strong>iPhone (Safari):</strong> tap the Share button, then{" "}
          <em>Add to Home Screen</em>.
        </li>
        <li>
          <strong>Computer (Chrome or Edge):</strong> click the install icon at
          the right end of the address bar.
        </li>
      </ul>
    </section>
  );
}
