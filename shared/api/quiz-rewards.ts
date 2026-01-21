import { supabase } from "@/shared/lib/supabase";

// region [Types]
type QuizRewardStatus = "PENDING" | "READY" | "USED";

export type TokenValidationResult =
  | { valid: false; reason: "NOT_FOUND" | "ALREADY_USED" | "EXPIRED" | "INVALID_STATUS" }
  | { valid: true; amount: number };
// endregion


// region [Transactions]
/**
 * [answer] 정답 검증 후 레코드 생성 (PENDING 상태)
 */
export const createAnswerToken = async (answerToken: string, quizId: string, amount: number = 100) => {
  const { error } = await supabase
    .from("quiz_rewards")
    .insert({
      answer_token: answerToken,
      quiz_id: quizId,
      amount,
      status: "PENDING" as QuizRewardStatus
    });

  return { success: !error, error };
};

/**
 * [generate] PENDING → READY 상태 변경 + reward_token 추가 (atomic)
 * 5분 이내 생성된 PENDING 상태만 유효
 */
export const activateRewardToken = async (answerToken: string, rewardToken: string): Promise<TokenValidationResult> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("quiz_rewards")
    .update({
      reward_token: rewardToken,
      status: "READY" as QuizRewardStatus
    })
    .eq("answer_token", answerToken)
    .eq("status", "PENDING")
    .gte("created_at", fiveMinutesAgo)
    .select("amount")
    .single();

  if (error || !data) {
    // 실패 원인 파악
    const { data: checkData } = await supabase
      .from("quiz_rewards")
      .select("status, created_at")
      .eq("answer_token", answerToken)
      .single();

    if (!checkData) {
      return { valid: false, reason: "NOT_FOUND" };
    }
    if (checkData.status !== "PENDING") {
      return { valid: false, reason: "ALREADY_USED" };
    }
    return { valid: false, reason: "EXPIRED" };
  }

  return { valid: true, amount: data.amount };
};

/**
 * [callback] reward_token 검증 (READY 상태 확인)
 */
export const validateRewardToken = async (rewardToken: string): Promise<TokenValidationResult> => {
  const { data, error } = await supabase
    .from("quiz_rewards")
    .select("amount, status")
    .eq("reward_token", rewardToken)
    .single();

  if (error || !data) {
    return { valid: false, reason: "NOT_FOUND" };
  }

  if (data.status === "USED") {
    return { valid: false, reason: "ALREADY_USED" };
  }

  if (data.status !== "READY") {
    return { valid: false, reason: "INVALID_STATUS" };
  }

  return { valid: true, amount: data.amount };
};

/**
 * [callback] READY → USED 상태 변경 (atomic, 송금 전 선점)
 */
export const claimRewardToken = async (rewardToken: string): Promise<TokenValidationResult> => {
  const { data, error } = await supabase
    .from("quiz_rewards")
    .update({
      status: "USED" as QuizRewardStatus,
      used_at: new Date().toISOString()
    })
    .eq("reward_token", rewardToken)
    .eq("status", "READY")
    .select("amount")
    .single();

  if (error || !data) {
    const checkResult = await validateRewardToken(rewardToken);
    if (!checkResult.valid) {
      return checkResult;
    }
    return { valid: false, reason: "ALREADY_USED" };
  }

  return { valid: true, amount: data.amount };
};

/**
 * [callback] 송금 실패 시 USED → READY 롤백
 */
export const releaseRewardToken = async (rewardToken: string) => {
  const { error } = await supabase
    .from("quiz_rewards")
    .update({
      status: "READY" as QuizRewardStatus,
      used_at: null
    })
    .eq("reward_token", rewardToken);

  return { success: !error, error };
};
// endregion