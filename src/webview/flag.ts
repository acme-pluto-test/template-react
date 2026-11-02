/** Webview mode is a build flag: a static export has one build per mode. */
export const isWebview = (): boolean => process.env.NEXT_PUBLIC_WEBVIEW === "1";

/** The origin of the native shell. Unset means no message is accepted (fail closed). */
export const nativeOrigin = (): string | undefined => process.env.NEXT_PUBLIC_NATIVE_ORIGIN || undefined;
