import { chatConfig } from "@/shared/config/chat";

interface ChatAdministratorSessionResponse {
  isAdministrator: true;
}

export class ChatModerationHttpError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ChatModerationHttpError";
  }
}

// region [Privates]
const createAdministratorRequestHeaders = (googleIdToken: string): Headers => {
  return new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${googleIdToken}`,
  });
};

const throwChatModerationHttpError = (response: Response): never => {
  if (response.status === 401) {
    throw new ChatModerationHttpError("관리자 로그인이 만료됐습니다.", response.status);
  }
  if (response.status === 403) {
    throw new ChatModerationHttpError("등록된 관리자 계정이 아닙니다.", response.status);
  }

  throw new ChatModerationHttpError("관리자 요청을 처리하지 못했습니다.", response.status);
};
// endregion

// region [Transactions]
export const verifyChatAdministrator = async (
  googleIdToken: string,
): Promise<ChatAdministratorSessionResponse> => {
  const administratorSessionResponse = await fetch(`${chatConfig.apiUrl}/v1/admin/chat/session`, {
    method: "POST",
    mode: "cors",
    headers: createAdministratorRequestHeaders(googleIdToken),
  });

  if (!administratorSessionResponse.ok) {
    throwChatModerationHttpError(administratorSessionResponse);
  }

  const responsePayload: unknown = await administratorSessionResponse.json();

  if (
    typeof responsePayload !== "object" ||
    responsePayload === null ||
    !("isAdministrator" in responsePayload) ||
    responsePayload.isAdministrator !== true
  ) {
    throw new ChatModerationHttpError("관리자 인증 응답이 올바르지 않습니다.", 502);
  }

  return { isAdministrator: true };
};

export const deleteChatMessageAsAdministrator = async (
  messageId: string,
  googleIdToken: string,
): Promise<void> => {
  const deleteMessageResponse = await fetch(
    `${chatConfig.apiUrl}/v1/admin/chat/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE",
      mode: "cors",
      headers: createAdministratorRequestHeaders(googleIdToken),
    },
  );

  if (!deleteMessageResponse.ok) {
    throwChatModerationHttpError(deleteMessageResponse);
  }
};
// endregion
