import DefaultLayout from "@/layouts/defaultLayout/DefaultLayout";
import Header from "@/layouts/header/Header";
import Footer from "@/layouts/footer/Footer";
import Content from "@/layouts/content/Content";
import { useInitializer } from "@/shared/hooks";


export default function Client() {

  // region [Hooks]

  useInitializer();

  // endregion


  return (
    <>
      <DefaultLayout>
        <Header />
        <Content />
        <Footer />
      </DefaultLayout>
    </>
  );
}
