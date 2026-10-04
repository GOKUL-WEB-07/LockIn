import { useId, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { useInstall } from "../lib/install";
import { Button } from "./ui";

export function InstallApp() {
  const { status, install } = useInstall();
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const helpId = useId();

  async function handleInstall() {
    setMessage("");
    if (status !== "ready") {
      setShowHelp((value) => !value);
      return;
    }
    setBusy(true);
    try {
      const outcome = await install();
      setMessage(outcome === "accepted"
        ? "Installation accepted. Follow your browser’s instructions to finish."
        : "Installation cancelled. You can install later from your browser menu.");
    } catch {
      setMessage("The install prompt could not open. Use your browser menu instead.");
      setShowHelp(true);
    } finally {
      setBusy(false);
    }
  }

  return <section className="install-app" aria-label="Install LockIn">
    <div className="install-app-heading"><Smartphone size={21} /><strong>LockIn on your home screen</strong></div>
    <p>Install from your Android browser for quick access. An internet connection is required to use LockIn.</p>
    {status === "installed" ? <p role="status">LockIn is installed and ready to use.</p> : <>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleInstall()} aria-expanded={showHelp} aria-controls={helpId}>
        <Download size={17} /> {busy ? "Opening installer…" : "Install on Android"}
      </Button>
      <div id={helpId} hidden={!showHelp} className="install-app-help">
        <p>On your Android phone:</p>
        <ol><li>Open this website in Chrome.</li><li>Open the browser’s three-dot menu.</li><li>Tap <strong>Add to home screen</strong> or <strong>Install app</strong>, then confirm.</li></ol>
        <p>If you opened a link inside another app, open it in Chrome first. On a computer, open this website on your Android phone to install there.</p>
      </div>
    </>}
    {message && status !== "installed" && <p role="status">{message}</p>}
  </section>;
}
