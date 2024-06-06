import PageTitle from "@/components/atom/PageTitle/pageTitle";
import MvrvExplain from "@/components/explain/MvrvExplain";
import PageLayout from "@/layout/pageLayout/pageLayout";

const MvrvPage = () => {
  return (
    <PageLayout>
      <PageTitle title="비트코인: MVRV Z-Score" />
      <MvrvExplain />
    </PageLayout>
  );
};

export default MvrvPage;
