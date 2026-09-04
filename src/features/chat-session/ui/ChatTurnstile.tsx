"use client";

import { useEffect, useRef, useState } from "react";
import { chatConfig } from "@/shared/config/chat";

interface ChatTurnstileProps {
  onVerifyToken: (turnstileToken: string) => void;
}

let turnstileScriptPromise: Promise<void> | null = null;

// region [Privates]
const loadTurnstileScript = (): Promise<void> => {
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const scriptElement = document.createElement("script");
    scriptElement.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    scriptElement.async = true;
    scriptElement.defer = true;
    scriptElement.addEventListener("load", () => resolve(), { once: true });
    scriptElement.addEventListener(
      "error",
      () => {
        scriptElement.remove();
        reject(new Error("Turnstile load failed"));
      },
      { once: true },
    );
    document.head.append(scriptElement);
  }).catch((error: unknown) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
};
// endregion

export function ChatTurnstile({ onVerifyToken }: ChatTurnstileProps) {
  // region [Hooks]
  const containerReference = useRef<HTMLDivElement | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // endregion

  // region [Privates]
  const renderTurnstile = async (): Promise<(() => void) | undefined> => {
    if (!chatConfig.isTurnstileConfigured || !containerReference.current) {
      setErrorMessage("봇 확인 설정이 준비되지 않아 지금은 읽기만 가능해요.");
      return;
    }

    try {
      await loadTurnstileScript();

      if (!window.turnstile || !containerReference.current) {
        throw new Error("Turnstile API unavailable");
      }

      const widgetId = window.turnstile.render(containerReference.current, {
        sitekey: chatConfig.turnstileSiteKey,
        action: "chat_write",
        theme: "auto",
        callback: onVerifyToken,
        "error-callback": () => {
          setErrorMessage("봇 확인을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        },
        "expired-callback": () => {
          setErrorMessage("봇 확인 시간이 만료됐어요. 다시 확인해 주세요.");
        },
      });

      return () => {
        window.turnstile?.remove(widgetId);
      };
    } catch {
      setErrorMessage("봇 확인을 불러오지 못해 지금은 읽기만 가능해요.");
      return;
    }
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    let cleanupTurnstile: (() => void) | undefined;
    let isDisposed = false;

    renderTurnstile().then((cleanup) => {
      if (isDisposed) {
        cleanup?.();
        return;
      }
      cleanupTurnstile = cleanup;
    });

    return () => {
      isDisposed = true;
      cleanupTurnstile?.();
    };
  }, [onVerifyToken]);
  // endregion

  return (
    <section className="border-y border-amber-300/70 bg-amber-50 px-4 py-3 dark:border-amber-700/60 dark:bg-amber-950/30">
      <p className="mb-2 text-xs leading-5 text-amber-900 dark:text-amber-100">
        글이나 반응을 남기기 전에 한 번만 봇 확인을 완료해 주세요.
      </p>
      <div ref={containerReference} />
      {errorMessage && (
        <p className="mt-2 text-xs leading-5 text-red-600 dark:text-red-300">{errorMessage}</p>
      )}
    </section>
  );
}
