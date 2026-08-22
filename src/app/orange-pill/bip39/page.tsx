import type { Metadata } from "next";
import { getBip39Data } from "@/entities/bip39";
import { env } from "@/shared/config/env";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { Bip39Page } from "@/views/bip39";

const PAGE_TITLE = "BIP39 니모닉 생성기";
const PAGE_DESCRIPTION = "비트코인 니모닉과 엔트로피를 확인해보세요.";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - BIP39`,
  description: PAGE_DESCRIPTION,
};

export const revalidate = 31536000; // 365일

export default async function Page() {
  const bip39Data = await getBip39Data();

  return (
    <PageLayout className="gap-4">
      <PageTitle label="BIP39" title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <Bip39Page initialData={bip39Data} />
    </PageLayout>
  );
}
