"use client";

import { kToast } from "kku-ui";
import { useCallback, useState } from "react";
import {
  ChatModerationHttpError,
  deleteChatMessageAsAdministrator,
  verifyChatAdministrator,
} from "../api/chatModerationApi";

export interface ChatModerationActions {
  isAdministrator: boolean;
  isAuthenticatingAdministrator: boolean;
  deletingMessageId: string | null;
  authenticateAdministrator: (googleIdToken: string) => Promise<boolean>;
  signOutAdministrator: () => void;
  deleteMessage: (messageId: string) => Promise<boolean>;
}

export const useChatModeration = (): ChatModerationActions => {
  // region [Hooks]
  const [administratorGoogleIdToken, setAdministratorGoogleIdToken] = useState<string | null>(null);
  const [isAuthenticatingAdministrator, setIsAuthenticatingAdministrator] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  // endregion

  // region [Privates]
  const clearAdministratorAuthentication = useCallback((): void => {
    setAdministratorGoogleIdToken(null);
    setDeletingMessageId(null);
  }, []);

  const getModerationErrorMessage = (caughtError: unknown): string => {
    return caughtError instanceof ChatModerationHttpError
      ? caughtError.message
      : "관리자 요청 중 오류가 발생했습니다.";
  };
  // endregion

  // region [Transactions]
  const authenticateAdministrator = useCallback(
    async (googleIdToken: string): Promise<boolean> => {
      setIsAuthenticatingAdministrator(true);

      try {
        await verifyChatAdministrator(googleIdToken);
        setAdministratorGoogleIdToken(googleIdToken);
        kToast.success("관리자 모드가 활성화됐습니다.");
        return true;
      } catch (caughtError) {
        clearAdministratorAuthentication();
        kToast.error(getModerationErrorMessage(caughtError));
        return false;
      } finally {
        setIsAuthenticatingAdministrator(false);
      }
    },
    [clearAdministratorAuthentication],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!administratorGoogleIdToken || deletingMessageId !== null) {
        return false;
      }

      setDeletingMessageId(messageId);

      try {
        await deleteChatMessageAsAdministrator(messageId, administratorGoogleIdToken);
        kToast.success("메시지를 삭제했습니다.");
        return true;
      } catch (caughtError) {
        if (
          caughtError instanceof ChatModerationHttpError &&
          (caughtError.statusCode === 401 || caughtError.statusCode === 403)
        ) {
          clearAdministratorAuthentication();
        }

        kToast.error(getModerationErrorMessage(caughtError));
        return false;
      } finally {
        setDeletingMessageId(null);
      }
    },
    [administratorGoogleIdToken, clearAdministratorAuthentication, deletingMessageId],
  );
  // endregion

  return {
    isAdministrator: administratorGoogleIdToken !== null,
    isAuthenticatingAdministrator,
    deletingMessageId,
    authenticateAdministrator,
    signOutAdministrator: clearAdministratorAuthentication,
    deleteMessage,
  };
};
