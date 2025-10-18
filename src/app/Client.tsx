import { QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from "react-toastify";
import { queryClient } from "@/app/queryClient";
import { toastOptions } from "@/shared/lib/toast";
import { PwaInstallAlarm, PwaInstallAlarmIOS } from "../components";
import { DefaultLayout, Header, Content, BottomNavigation} from "@/layouts";
import Initializer from "@/app/Initializer";


export default function Client() {

  return (
    <QueryClientProvider client={queryClient}>
      <Initializer />
      <DefaultLayout>
        <Header />
        <Content />
        <BottomNavigation />
      </DefaultLayout>
      <PwaInstallAlarm />
      <PwaInstallAlarmIOS />
      <ToastContainer {...toastOptions} />
    </QueryClientProvider>
  );
}
