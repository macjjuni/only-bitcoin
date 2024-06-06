import { useEffect, useState, useCallback, memo } from "react";
import { Stack, Typography, Divider } from "@mui/material";
// Zustand
import { useBearStore, bearStore } from "@/store";
import { type BtcProps } from "@/store/type";
// Components
import WidgetFrame from "@/components/molecule/WidgetFrame";
import PriceStandardSwitch from "./components/Switch";
import EcoSystemDialog from "@/components/modal/EcoSystemDialog";
import AmountInput from "./components/AmountInput";
import SatoshiLabel from "./components/SatoshiLabel";
import KrwInput from "./components/KrwInput";
import TransIcon from "@/components/icon/TransIcon";

import { ecoSystemPyramid } from "@/data/btcInfo";
import { comma, isSafari } from "@/utils/common";

const numReg = /^[-+]?(\d+(\.\d*)?|\.\d+)$/;
const commaLength = 5; // 소숫점
const satoshi = 100000000;

const BtcToKrw = ({ btc }: { btc: BtcProps }) => {
  const amount = useBearStore((state) => state.amount);

  // state
  const [standard, setStandard] = useState(false); // 기준 : 개수(false) or 가격(false)
  const [price, setPrice] = useState("0"); // 금액
  const [sat, setSat] = useState("0");
  // state - Eco System
  const [isEco, setEco] = useState(false);
  const [emoji, setEmoji] = useState("");

  // 인풋 초기화
  const initialInput = useCallback(() => {
    bearStore.setAmount("0");
    setPrice("0");
    setSat("0");
  }, []);

  // 가격 계산
  const calcPrice = useCallback(
    (amt: number) => {
      return comma((btc.krw * Number(amt)).toFixed(0).toString());
    },
    [btc]
  );

  // 비트코인 개수 변경
  const handleAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value;
    if (amountTxt === "" || amountTxt === "0") {
      bearStore.setAmount("0");
    } else {
      const cleanNum = amountTxt.replace(/^0+/, "");
      if (cleanNum.charAt(0) === ".") {
        bearStore.setAmount(`0${cleanNum}`);
      } else {
        bearStore.setAmount(cleanNum);
      }
      setPrice(calcPrice(Number(amountTxt)));
    }
  }, []);
  // IOS 전용
  const iosHandleAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value;
    bearStore.setAmount(amountTxt);
    setPrice(calcPrice(Number(amountTxt)));
  }, []);

  // 원화 금액 변경
  const handlePrice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const priceTxt = e.target.value.replace(/(^0+)/, "").replace(/,/g, "");
    if (priceTxt === "" || Number.isNaN(Number(priceTxt))) {
      initialInput();
    } else {
      setPrice(comma(priceTxt));
      bearStore.setAmount((Number(priceTxt) / btc.krw).toFixed(commaLength).toString());
    }
  }, []);

  const toggleStandard = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStandard(e.target.checked);
  }, []);

  // 생태계별 표시
  const findEcoSystem = useCallback(() => {
    const numAmt = Number(amount.replace(/[^\d.]/g, ""));
    const me = ecoSystemPyramid.find((eco) => numAmt === 0 || (numAmt >= eco.min && eco.max > numAmt));
    if (me) setEmoji(me.emoji);
  }, [amount]);

  // 생태계 모달 오픈
  const onEco = useCallback(() => {
    setEco(true);
  }, []);

  useEffect(() => {
    if (numReg.test(amount)) {
      const calcSat = (Number(amount) * satoshi).toFixed(0).toString();
      setSat(comma(calcSat));
      findEcoSystem();
      return;
    }
    setSat("0");
  }, [amount]);

  // 실시간 가격 변동 시 인풋 박스에 반영
  useEffect(() => {
    if (standard) {
      const numPrice = Number(price.replace(/(^0+)/, "").replace(/,/g, "")); // 금액
      const calcAmount = (numPrice / btc.krw).toFixed(commaLength).toString();
      bearStore.setAmount(calcAmount);
    } else {
      // 개수
      const numAmount = Number(amount.replace(/(^0+)/, "").replace(/,/g, ""));
      setPrice(calcPrice(numAmount));
    }
  }, [btc]);

  return (
    <WidgetFrame id="btcKrw" icon={<TransIcon size={28} />} title="BTC/KRW">
      <Stack gap={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap">
          <PriceStandardSwitch label="원화 기준" value={standard} onChange={toggleStandard} />
          {/* 생태계 이모지 */}
          <Typography fontSize={28} width={40} onClick={onEco} sx={{ cursor: "pointer" }}>
            {emoji}
          </Typography>
        </Stack>

        <Stack direction={standard ? "column-reverse" : "column"} justifyContent="center" gap={1.5} height="calc(100% - 85px)">
          {/* BTC Input */}
          <AmountInput value={amount} readOnly={standard} onChange={!isSafari ? handleAmount : iosHandleAmount} standard={standard} />
          {/* KRW Input */}
          <KrwInput value={price} readOnly={!standard} onChange={handlePrice} standard={standard} />
        </Stack>
        <Divider />
        {/* Satoshi Label */}
        <SatoshiLabel sat={sat} />
      </Stack>
      <EcoSystemDialog open={isEco} setOpen={setEco} />
    </WidgetFrame>
  );
};

export default memo(BtcToKrw);
