const BLINK_API_URL = "https://api.blink.sv/graphql";
const BLINK_ACCESS_TOKEN = process.env?.BLINK_ACCESS_TOKEN || "";

// region [Types]
interface BlinkPaymentResult {
  success: boolean;
  error?: string;
}
// endregion


// region [Privates]
const blinkFetch = async (query: string, variables?: Record<string, unknown>) => {
  const response = await fetch(BLINK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": BLINK_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
};
// endregion


// region [Transactions]
/**
 * Blink 기본 지갑 ID 조회
 */
export const getBlinkWalletId = async (): Promise<string | null> => {
  const query = `query { me { defaultAccount { defaultWalletId } } }`;
  const result = await blinkFetch(query);

  return result.data?.me?.defaultAccount?.defaultWalletId || null;
};

/**
 * Lightning Invoice 결제 실행
 */
export const sendLnPayment = async (paymentRequest: string, memo?: string): Promise<BlinkPaymentResult> => {
  const walletId = await getBlinkWalletId();

  if (!walletId) {
    return { success: false, error: "Wallet not found" };
  }

  const query = `
    mutation LnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
      lnInvoicePaymentSend(input: $input) {
        status
        errors { message }
      }
    }
  `;

  const variables = {
    input: {
      walletId,
      paymentRequest,
      memo: memo || "Quiz Reward",
    },
  };

  const result = await blinkFetch(query, variables);
  const status = result.data?.lnInvoicePaymentSend?.status;

  if (status === "SUCCESS") {
    return { success: true };
  }

  const errorMessage = result.data?.lnInvoicePaymentSend?.errors?.[0]?.message || "Payment failed";
  return { success: false, error: errorMessage };
};
// endregion