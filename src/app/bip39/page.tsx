import { getBip39Data } from "@/entities/bip39";
import { createPageMetadata } from "@/shared/config/metadata";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { Bip39Page } from "@/views/bip39";

const PAGE_TITLE = "BIP39 단어 검색";
const PAGE_DESCRIPTION = "니모닉 단어 목록과 시드 도트를 확인해보세요.";

export const metadata = createPageMetadata({
  path: "/bip39",
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
});

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
