import { ConvertPannel } from "@/widgets/pages/btc2krw";
import { NotKeyNotYourBitcoin } from "@/widgets";
import "./Btc2FiatPage.scss";


export default function Btc2FiatPage() {

  return (
    <section className="btc-2-fiat-page__area">
      <ConvertPannel />
      <NotKeyNotYourBitcoin />
    </section>
  );
}
