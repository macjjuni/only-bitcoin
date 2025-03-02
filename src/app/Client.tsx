import { ToastContainer } from "react-toastify";
import { useInitializer } from "@/shared/hooks";
import { toastOptions } from "@/shared/lib/toast";
import { PwaInstallAlarm, PwaInstallAlarmIOS } from "@/widgets";
import { DefaultLayout, Header, Content, BottomNavigation} from "@/layouts";


export default function Client() {

  // region [Hooks]

  useInitializer();

  // endregion


  return (
    <>
      <DefaultLayout>
        <Header />
        <Content />
        <BottomNavigation />
      </DefaultLayout>
      <PwaInstallAlarm />
      <PwaInstallAlarmIOS />
      <ToastContainer {...toastOptions} />
    </>
  );
}
