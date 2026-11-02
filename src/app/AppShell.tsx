import Link from "next/link";
import type { ReactNode } from "react";
import { isWebview } from "@/webview/flag";
import { WebviewBridge } from "@/webview/WebviewBridge";
import { Providers } from "./providers";
import styles from "./shell.module.css";

/** Webview mode has no global navigation: the native shell owns it. */
export function AppShell({ children }: { children: ReactNode }) {
  const webview = isWebview();
  return (
    <Providers>
      {webview ? <WebviewBridge /> : null}
      {webview ? null : (
        <nav aria-label="Main" className={styles.nav}>
          <Link href="/">Home</Link>
          <Link href="/about/">About</Link>
        </nav>
      )}
      <main className={styles.main}>{children}</main>
    </Providers>
  );
}
