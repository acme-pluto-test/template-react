import { encode, parseNativeToWeb, type NativeToWebMessage, type WebToNativeMessage } from "@/bridge/bridge";
import { nativeOrigin } from "./flag";

// The origin check below is a fail-closed switch, not authentication: on iOS native calls window.pluto.receive itself, and any script
// already running in the page could call it too. The page must load only its own bundle (no third-party scripts) for the bridge to be trusted.
// The only module that touches the platform objects (see webview-bridge-web/references/web-adapter.md).
// Android: window.pluto.postMessage(text) and window.pluto.onmessage(event). iOS: window.webkit.messageHandlers.pluto.postMessage(text),
// and native answers by calling window.pluto.receive(text).
interface PlutoObject {
  postMessage?: (text: string) => void;
  onmessage?: ((event: { data: unknown; origin?: string }) => void) | null;
  receive?: (text: string) => void;
}
type Host = Window & { pluto?: PlutoObject; webkit?: { messageHandlers?: { pluto?: { postMessage: (text: string) => void } } } };

const host = (): Host => window as Host;

export function sendToNative(message: WebToNativeMessage): void {
  const text = encode(message);
  const h = host();
  if (h.pluto?.postMessage) h.pluto.postMessage(text);
  else h.webkit?.messageHandlers?.pluto?.postMessage(text);
}

/** Calls `handler` for each valid message from the native shell; anything else is dropped. Returns the stop function. */
export function listenToNative(handler: (message: NativeToWebMessage) => void): () => void {
  const h = host();
  const accept = (data: unknown): void => {
    if (typeof data !== "string") return;
    try {
      handler(parseNativeToWeb(data));
    } catch {
      // not a valid native-to-web message: ignored, nothing changes
    }
  };
  const pluto: PlutoObject = h.pluto ?? {};
  pluto.onmessage = (event) => {
    if (!nativeOrigin()) return; // fail closed: with no shell configured nothing is accepted
    // The listener of an Android WebView answers with a message that has no origin at all (measured on a device); a message that
    // names an origin must name the shell's. The origin is public information and says why a shell is not heard.
    if (event.origin !== undefined && event.origin !== nativeOrigin()) {
      console.warn(`pluto: dropped a message from origin ${JSON.stringify(event.origin)}, expected ${JSON.stringify(nativeOrigin() ?? null)}`);
      return;
    }
    accept(event.data);
  };
  pluto.receive = (text) => {
    // native calls this itself, so there is no event origin; an unconfigured shell still accepts nothing
    if (!nativeOrigin()) return;
    accept(text);
  };
  h.pluto = pluto;
  return () => {
    pluto.onmessage = null;
    pluto.receive = undefined;
  };
}
