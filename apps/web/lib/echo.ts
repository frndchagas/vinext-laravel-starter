"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echo: Echo<"reverb"> | undefined;

function requiredEnvironmentValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing public environment variable: ${name}`);
  }

  return value;
}

export function getEcho(): Echo<"reverb"> {
  if (typeof window === "undefined") {
    throw new Error("Laravel Echo is only available in the browser.");
  }

  if (echo) {
    return echo;
  }

  const key = requiredEnvironmentValue(
    "NEXT_PUBLIC_REVERB_APP_KEY",
    process.env.NEXT_PUBLIC_REVERB_APP_KEY,
  );
  const secure = window.location.protocol === "https:";
  const port = Number(window.location.port || (secure ? 443 : 80));

  echo = new Echo<"reverb">({
    Pusher,
    authEndpoint: "/api/broadcasting/auth",
    broadcaster: "reverb",
    enabledTransports: ["ws", "wss"],
    forceTLS: secure,
    key,
    wsHost: window.location.hostname,
    wsPath: "/ws",
    wsPort: port,
    wssPort: port,
  });

  return echo;
}

export function disconnectEcho(): void {
  echo?.disconnect();
  echo = undefined;
}
