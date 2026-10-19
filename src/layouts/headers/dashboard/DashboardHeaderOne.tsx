"use client"
import Image from "next/image"
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import dashboardLogo from "@/assets/images/logo/logo_01.svg";
import dashboardIconActive_1 from "@/assets/images/dashboard/icon/icon_1_active.svg";
import dashboardIconActive_2 from "@/assets/images/dashboard/icon/icon_2_active.svg";
import dashboardIcon_1 from "@/assets/images/dashboard/icon/icon_1.svg";
import dashboardIcon_2 from "@/assets/images/dashboard/icon/icon_2.svg";
import dashboardIconActive_3 from "@/assets/images/dashboard/icon/icon_3_active.svg";
import dashboardIcon_3 from "@/assets/images/dashboard/icon/icon_3.svg";
import dashboardIconActive_4 from "@/assets/images/dashboard/icon/icon_4_active.svg";
import dashboardIcon_4 from "@/assets/images/dashboard/icon/icon_4.svg";
import dashboardIconActive_6 from "@/assets/images/dashboard/icon/icon_6_active.svg";
import dashboardIcon_6 from "@/assets/images/dashboard/icon/icon_6.svg";
import dashboardIconActive_7 from "@/assets/images/dashboard/icon/icon_7_active.svg";
import dashboardIcon_7 from "@/assets/images/dashboard/icon/icon_7.svg";
import dashboardIcon_11 from "@/assets/images/dashboard/icon/icon_41.svg";

const DashboardHeaderOne = ({ isActive, setIsActive }: any) => {
   const pathname = usePathname();
   const router = useRouter();
   const supabase = createClient();

   const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
   };

   const icon = (href:string, kind:number) => {
      const active = pathname === href || pathname.startsWith(href + "/");
      if (kind === 1) return active ? dashboardIconActive_1 : dashboardIcon_1;
      if (kind === 2) return active ? dashboardIconActive_2 : dashboardIcon_2;
      if (kind === 3) return active ? dashboardIconActive_3 : dashboardIcon_3;
      if (kind === 4) return active ? dashboardIconActive_4 : dashboardIcon_4;
      if (kind === 6) return active ? dashboardIconActive_6 : dashboardIcon_6;
      return active ? dashboardIconActive_7 : dashboardIcon_7;
   };

   const item = (href:string, label:string, kind:number=7) => (
      <li className="plr">
         <Link href={href} className={`d-flex w-100 align-items-center ${pathname === href || pathname.startsWith(href + "/") ? "active" : ""}`}>
            <Image src={icon(href, kind)} alt="" />
            <span>{label}</span>
         </Link>
      </li>
   );

   return (
      <aside className={`dash-aside-navbar ${isActive ? "show" : ""}`}>
         <div className="position-relative">
            <div className="logo d-md-block d-flex align-items-center justify-content-between plr bottom-line pb-30">
               <Link href="/dashboard/dashboard-index"><Image src={dashboardLogo} alt="Meu Patrimônio" /></Link>
               <button onClick={() => setIsActive(false)} className="close-btn d-block d-md-none"><i className="fa-light fa-circle-xmark"></i></button>
            </div>

            <nav className="dasboard-main-nav pt-30 pb-30 bottom-line">
               <ul className="style-none">
                  <li><div className="nav-title">Visão geral</div></li>
                  {item("/dashboard/dashboard-index","Painel",1)}

                  <li className="pt-20"><div className="nav-title">Cadastros</div></li>
                  {item("/dashboard/properties-list","Imóveis",6)}
                  {item("/dashboard/owners","Proprietários",2)}
                  {item("/dashboard/tenants","Inquilinos",2)}
                  {item("/dashboard/add-property","Adicionar imóvel",7)}

                  <li className="pt-20"><div className="nav-title">Locação</div></li>
                  {item("/dashboard/contracts","Locações",3)}
                  {item("/dashboard/lease-contracts","Contratos",3)}
                  {item("/dashboard/contract-templates","Modelos contratuais",7)}
                  {item("/dashboard/adjustments","Reajustes",7)}

                  <li className="pt-20"><div className="nav-title">Financeiro</div></li>
                  {item("/dashboard/invoices","Cobranças / Faturas",4)}
                  {item("/dashboard/rent","Recebimentos",4)}
                  {item("/dashboard/expenses","Despesas",4)}
                  {item("/dashboard/reports","Relatórios",4)}

                  <li className="pt-20"><div className="nav-title">Operação</div></li>
                  {item("/dashboard/inspections","Vistorias",7)}

                  <li className="pt-20"><div className="nav-title">Comunicação</div></li>
                  {item("/dashboard/message","Mensagens",2)}

                  <li className="bottom-line pt-30 lg-pt-20 mb-30 lg-mb-20"></li>
                  <li><div className="nav-title">Minha conta</div></li>
                  {item("/dashboard/profile","Perfil",3)}
                  {item("/dashboard/account-settings","Configurações",4)}
               </ul>
            </nav>

            <div className="profile-complete-status bottom-line pb-35 plr">
               <div className="progress-value fw-500">Meu Patrimônio</div>
               <div className="progress-line position-relative"><div className="inner-line" style={{ width: "70%" }}></div></div>
               <p>Gestão imobiliária integrada</p>
            </div>

            <div className="plr">
               <button onClick={handleLogout} className="d-flex w-100 align-items-center logout-btn border-0 bg-transparent">
                  <div className="icon tran3s d-flex align-items-center justify-content-center rounded-circle"><Image src={dashboardIcon_11} alt="" /></div>
                  <span>Sair</span>
               </button>
            </div>
         </div>
      </aside>
   )
}

export default DashboardHeaderOne;
