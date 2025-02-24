import { ToastContainer } from "react-toastify";
import DefaultLayout from "@/layouts/defaultLayout/DefaultLayout";
import PageTitle from "@/layouts/pageTitle/PageTitle";
import Content from "@/layouts/content/Content";
import BottomNavigation from "@/layouts/bottomNavigation/BottomNavigation";
import { useInitializer } from "@/shared/hooks";
import { toastOptions } from "@/shared/lib/toast";
import { PwaInstallAlarm } from "@/widgets";


export default function Client() {

  // region [Hooks]

  useInitializer();

  // endregion


  return (
    <>
      <DefaultLayout>
        <PageTitle />
        <Content />
        <BottomNavigation />
      </DefaultLayout>
      <PwaInstallAlarm />
      <ToastContainer {...toastOptions} />
    </>
  );
}
