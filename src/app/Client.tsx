import { Outlet } from "react-router";
import DefaultLayout from "@/layouts/defaultLayout/DefaultLayout";
import Header from "@/layouts/header/Header";
import Footer from "@/layouts/footer/Footer";
import Content from "@/layouts/content/Content";

export default function Client() {

  return (<>
    <DefaultLayout>
      <Header/>
      <Content/>
      <Footer/>
    </DefaultLayout>
    </>);
}
