"use client";

import { LogOut, Shield, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatConfig } from "@/shared/config/chat";

interface ChatAdministratorControlProps {
  isAdministrator: boolean;
  isAuthenticating: boolean;
  onAuthenticate: (googleIdToken: string) => Promise<boolean>;
  onSignOut: () => void;
}

interface GoogleSignInButtonProps {
  isAuthenticating: boolean;
  onCredential: (googleIdToken: string) => Promise<boolean>;
}

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services-script";
const GOOGLE_IDENTITY_SCRIPT_SOURCE = "https://accounts.google.com/gsi/client";

function GoogleSignInButton({ isAuthenticating, onCredential }: GoogleSignInButtonProps) {
  // region [Hooks]
  const googleButtonContainerReference = useRef<HTMLDivElement | null>(null);
  const [hasGoogleScriptFailed, setHasGoogleScriptFailed] = useState(false);
  // endregion

  // region [Events]
  const onReceiveGoogleCredential = useCallback(
    (credentialResponse: GoogleIdentityCredentialResponse): void => {
      void onCredential(credentialResponse.credential);
    },
    [onCredential],
  );
  // endregion

  // region [Privates]
  const renderGoogleSignInButton = useCallback((): void => {
    const googleIdentity = window.google?.accounts.id;
    const googleButtonContainer = googleButtonContainerReference.current;

    if (!googleIdentity || !googleButtonContainer) {
      return;
    }

    googleButtonContainer.replaceChildren();
    googleIdentity.initialize({
      client_id: chatConfig.googleOAuthClientId,
      callback: onReceiveGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    googleIdentity.renderButton(googleButtonContainer, {
      type: "standard",
      theme: "outline",
      size: "medium",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left",
      width: 220,
      locale: "ko",
    });
  }, [onReceiveGoogleCredential]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (window.google?.accounts.id) {
      renderGoogleSignInButton();
      return;
    }

    const existingScriptElement = document.getElementById(
      GOOGLE_IDENTITY_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const googleScriptElement = existingScriptElement ?? document.createElement("script");
    const onLoadGoogleScript = (): void => {
      setHasGoogleScriptFailed(false);
      renderGoogleSignInButton();
    };
    const onErrorGoogleScript = (): void => {
      setHasGoogleScriptFailed(true);
    };

    googleScriptElement.addEventListener("load", onLoadGoogleScript);
    googleScriptElement.addEventListener("error", onErrorGoogleScript);

    if (!existingScriptElement) {
      googleScriptElement.id = GOOGLE_IDENTITY_SCRIPT_ID;
      googleScriptElement.src = GOOGLE_IDENTITY_SCRIPT_SOURCE;
      googleScriptElement.async = true;
      document.head.appendChild(googleScriptElement);
    }

    return () => {
      googleScriptElement.removeEventListener("load", onLoadGoogleScript);
      googleScriptElement.removeEventListener("error", onErrorGoogleScript);
    };
  }, [renderGoogleSignInButton]);
  // endregion

  if (hasGoogleScriptFailed) {
    return (
      <p className="text-xs text-red-600 dark:text-red-300">Google 로그인을 불러오지 못했습니다.</p>
    );
  }

  return (
    <div className={isAuthenticating ? "pointer-events-none opacity-50" : undefined}>
      <div ref={googleButtonContainerReference} className="min-h-8" />
      {isAuthenticating && <p className="mt-2 text-center text-xs text-neutral-500">확인 중...</p>}
    </div>
  );
}

export default function ChatAdministratorControl({
  isAdministrator,
  isAuthenticating,
  onAuthenticate,
  onSignOut,
}: ChatAdministratorControlProps) {
  // region [Events]
  const onReceiveGoogleCredential = async (googleIdToken: string): Promise<boolean> => {
    return onAuthenticate(googleIdToken);
  };

  const onClickSignOutButton = (): void => {
    window.google?.accounts.id.disableAutoSelect();
    onSignOut();
  };
  // endregion

  // region [Templates]
  const AdministratorContentTemplate = isAdministrator ? (
    <div>
      <p className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-300">
        <ShieldCheck size={16} />
        관리자 모드
      </p>
      <button
        type="button"
        onClick={onClickSignOutButton}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 text-xs font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        <LogOut size={14} />
        관리자 로그아웃
      </button>
    </div>
  ) : chatConfig.isAdministratorAuthenticationConfigured ? (
    <div>
      <p className="mb-3 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        등록된 관리자 Google 계정으로 로그인하세요.
      </p>
      <GoogleSignInButton
        isAuthenticating={isAuthenticating}
        onCredential={onReceiveGoogleCredential}
      />
    </div>
  ) : (
    <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
      관리자 로그인이 설정되지 않았습니다.
    </p>
  );
  // endregion

  return (
    <section className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
      {!isAdministrator && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold">
          <Shield size={14} />
          관리자 로그인
        </p>
      )}
      {AdministratorContentTemplate}
    </section>
  );
}
