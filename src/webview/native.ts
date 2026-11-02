import { encode, parseNativeToWeb, type NativeToWebMessage, type WebToNativeMessage } from "@/bridge/bridge";
import { nativeOrigin } from "./flag";

// The origin check below is a fail-closed switch, not authentication: on iOS native calls window.pluto.receive itself, and any script
// already running in the page could call it too. The page must load only its own bundle (no third-party scripts) for the bridge to be trusted.
// The only module that touches the platform objects (see webview-bridge-web/references/web-adapter.md).
// Android: window.pluto.postMessage(text) and window.pluto.onmessage(event). iOS: window.webkit.messageHandlers.pluto.postMessage(text),
// and native answers by calling window.pluto.receive(text).
interface PlutoObject {
  postMessage?: (text: string) => void;
  onmessage?: ((event: { data: unknown; origin: string }) => void) | null;
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
    if (event.origin !== nativeOrigin()) return; // with no origin configured nothing is equal: fail closed
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
