import DefaultLayout from "@/layouts/defaultLayout/DefaultLayout";
import Header from "@/layouts/header/Header";
import Footer from "@/layouts/footer/Footer";
import Content from "@/layouts/content/Content";
import BottomNavigation from "@/widgets/bottomNavigation/BottomNavigation";
import { useResizeOver } from "@/shared/hooks";

export default function Client() {

  // region [Hooks]

  const {isOver: isDeskTopSize} = useResizeOver();

  // endregion


  return (<>
    <DefaultLayout>
      {isDeskTopSize && <Header/>}
      <Content/>
      {isDeskTopSize ? <Footer/> : <BottomNavigation />}
    </DefaultLayout>
    </>);
}
