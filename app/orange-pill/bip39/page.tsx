import type { Metadata } from "next";
import { getBip39Data } from "@/entities/bip39";
import { PageLayout } from "@/layouts";
import { env } from "@/shared/config/env";
import { Bip39Page } from "@/views/bip39";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - BIP39`,
  description: "비트코인 니모닉과 엔트로피를 확인해보세요.",
};

export const revalidate = 31536000; // 365일

export default async function Page() {
  const bip39Data = await getBip39Data();

  return (
    <PageLayout className="pt-2 flex flex-col gap-6">
      <Bip39Page initialData={bip39Data} />
    </PageLayout>
  );
}
