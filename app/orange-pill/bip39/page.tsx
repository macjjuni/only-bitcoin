import { PageLayout } from "@/layouts";
import { Metadata } from "next";
import { env } from "@/shared/config/env";
import BIP39Page from "@/components/features/orange-pill/bip39Page/BIP39Page";
import useBIP39Query from "@/shared/query/useBip39Query";


export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - BIP39`,
  description: "비트코인 니모닉과 엔트로피를 확인해보세요."
};

export const revalidate = 31536000; // 365일


export default async function Page() {

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const bip39Data = await useBIP39Query();

  return (
    <PageLayout className="pt-2 flex flex-col gap-6">
      <BIP39Page initialData={bip39Data} />
    </PageLayout>
  );
}