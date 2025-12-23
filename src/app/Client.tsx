import { QueryClientProvider } from "@tanstack/react-query";
import { KToast, KToasterProps } from "kku-ui";
import { queryClient } from "@/app/queryClient";
import { PwaInstallAlarm, PwaInstallAlarmIOS } from "../components";
import { DefaultLayout, Header, Content, BottomNavigation } from "@/layouts";
import Initializer from "@/app/Initializer";


const toastProps: KToasterProps = {
  position: "bottom-center",
  closeButton: true,
  duration: 2000,
  size: window.innerWidth > 524 ? 'md' : 'sm',
  mobileOffset: 88,
};

export default function Client() {

  return (
    <QueryClientProvider client={queryClient}>
      <Initializer />
      <KToast {...toastProps} offset={120} />
      <DefaultLayout>
        <Header />
        <Content />
        <BottomNavigation />
      </DefaultLayout>
      <PwaInstallAlarm />
      <PwaInstallAlarmIOS />
    </QueryClientProvider>
  );
}
