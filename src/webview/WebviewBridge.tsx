"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { NativeToWebMessage } from "@/bridge/bridge";
import { configureApi } from "@/shared/api/client";
import { listenToNative, sendToNative } from "./native";
import { authorization, requestRefresh, setToken } from "./session";

export function apply(message: NativeToWebMessage, root: HTMLElement = document.documentElement): void {
  switch (message.type) {
    case "theme.changed":
      root.dataset.theme = message.payload.mode;
      if (message.payload.accentColor) root.style.setProperty("--accent", message.payload.accentColor);
      else root.style.removeProperty("--accent");
      break;
    case "safe-area.changed":
      for (const side of ["top", "right", "bottom", "left"] as const) root.style.setProperty(`--safe-area-${side}`, `${message.payload[side]}px`);
      break;
    case "auth.token":
      setToken(message.payload);
      break;
  }
}

/** Webview mode only: listens to the native shell and tells it when the page can receive. */
export function WebviewBridge() {
  const pathname = usePathname();
  const listening = useRef(false);
  const lastRoute = useRef<string>(undefined);

  useEffect(() => {
    configureApi({ authorization, onUnauthorized: () => requestRefresh("unauthorized") });
    const stop = listenToNative((message) => apply(message));
    listening.current = true;
    return () => {
      stop();
      listening.current = false;
    };
  }, []);

  useEffect(() => {
    if (!listening.current || lastRoute.current === pathname) return;
    lastRoute.current = pathname;
    sendToNative({ version: 1, type: "navigation.ready", payload: { route: pathname } });
  }, [pathname]);

  return null;
}
