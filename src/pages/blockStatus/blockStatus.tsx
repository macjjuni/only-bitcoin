import { Stack, Typography, useMediaQuery } from "@mui/material";
import HalvingExpain from "@/components/explain/HalvingExpain";
import HalvingTable from "@/components/molecule/HalvingTable";
import CubeLottie from "@/pages/dashboard/components/blockView/components/CubeLottie";
import CardItem from "@/components/molecule/CardItem";
import Progress from "@/components/molecule/Progress";
import PageTitle from "@/components/atom/PageTitle/pageTitle";
import PageSubTitle from "@/components/atom/PageSubTitle/pageSubTitle";
import CountText from "../../components/atom/countText/countText";

import { useBearStore } from "@/store";
import { calcRemainingTime } from "@/utils/common";
import { formatDate } from "@/utils/date";
import { responsive } from "@/styles/style";
import PageLayout from "@/layout/pageLayout/pageLayout";

const BitcoinHalvingPage = () => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`);
  const blockData = useBearStore((state) => state.blockData);

  return (
    <PageLayout>
      {/* 페이지 타이틀 */}
      <PageTitle title="블록 현황" />
      {/* 페이지 서브 타이틀 */}
      {/* <PageSubTitle subTitle="블록 현황" /> */}
      {/* 실시간 블록 현황 */}
      <Stack direction={matches ? "row" : "column"} width="100%" spacing={1.5} mb={2} sx={{ overflowX: "auto" }}>
        <CardItem
          title="현재 블록 높이"
          matches={matches}
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold">
                <CountText text={blockData.height} isAnime duration={0.3} />
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb={1}>
                타임스탬프
              </Typography>
              <div>{formatDate(blockData.timeStamp).replace(/-/g, ".")}</div>
            </>
          }
        />
        <CardItem
          title="다음 반감기 블록 높이"
          matches={matches}
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold">
                <CountText text={blockData.nextHalving.nextHalvingHeight} isAnime duration={0.3} />
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb={1}>
                예상시간
              </Typography>
              <div>
                {calcRemainingTime(blockData.nextHalving.remainingHeight)}({blockData.nextHalving.nextHalvingPredictedDate})
              </div>
            </>
          }
        />
        <CardItem
          title="다음 반감기까지 남은 블록"
          matches={matches}
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                <CountText text={blockData.nextHalving.remainingHeight} isAnime duration={0.3} />
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb={1}>
                진행률
              </Typography>
              {/* 다음 반감기까지 진행률 프로그레스바 */}
              <Progress />
            </>
          }
        />
      </Stack>
      {/* 반감기 설명 컴포넌트 */}
      <HalvingExpain nextHeight={blockData.nextHalving.nextHalvingHeight} />

      <PageSubTitle subTitle="반감기 표" />
      {/* 반감기 표 컴포넌트 */}
      <HalvingTable />
    </PageLayout>
  );
};

export default BitcoinHalvingPage;
