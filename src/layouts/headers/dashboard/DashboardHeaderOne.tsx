"use client"
import Image from "next/image"
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation'
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

   return (
      <aside className={`dash-aside-navbar ${isActive ? "show" : ""}`}>
         <div className="position-relative">
            <div className="logo d-md-block d-flex align-items-center justify-content-between plr bottom-line pb-30">
               <Link href="/dashboard/dashboard-index">
                  <Image src={dashboardLogo} alt="Meu Patrimônio" />
               </Link>
               <button onClick={() => setIsActive(false)} className="close-btn d-block d-md-none"><i className="fa-light fa-circle-xmark"></i></button>
            </div>

            <nav className="dasboard-main-nav pt-30 pb-30 bottom-line">
               <ul className="style-none">
                  <li><div className="nav-title">Gestão patrimonial</div></li>

                  <li className="plr">
                     <Link href="/dashboard/dashboard-index" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/dashboard-index' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/dashboard-index' ? dashboardIconActive_1 : dashboardIcon_1} alt="" />
                        <span>Visão geral</span>
                     </Link>
                  </li>

                  <li className="plr">
                     <Link href="/dashboard/properties-list" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/properties-list' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/properties-list' ? dashboardIconActive_6 : dashboardIcon_6} alt="" />
                        <span>Meus imóveis</span>
                     </Link>
                  </li>

                  <li className="plr">
                     <Link href="/dashboard/add-property" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/add-property' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/add-property' ? dashboardIconActive_7 : dashboardIcon_7} alt="" />
                        <span>Adicionar imóvel</span>
                     </Link>
                  </li>

                  <li className="plr">
                     <Link href="/dashboard/tenants" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/tenants' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/tenants' ? dashboardIconActive_2 : dashboardIcon_2} alt="" />
                        <span>Locatários</span>
                     </Link>
                  </li>

                  <li className="plr">
                     <Link href="/dashboard/contracts" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/contracts' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/contracts' ? dashboardIconActive_3 : dashboardIcon_3} alt="" />
                        <span>Contratos</span>
                     </Link>
                  </li>

                  <li className="plr">
                     <Link href="/dashboard/rent" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/rent' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/rent' ? dashboardIconActive_4 : dashboardIcon_4} alt="" />
                        <span>Financeiro</span>
                     </Link>
                  </li>

                  <li className="bottom-line pt-30 lg-pt-20 mb-40 lg-mb-30"></li>
                  <li><div className="nav-title">Minha conta</div></li>

                  <li className="plr">
                     <Link href="/dashboard/profile" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/profile' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/profile' ? dashboardIconActive_3 : dashboardIcon_3} alt="" />
                        <span>Perfil</span>
                     </Link>
                  </li>

                  <li className="plr">
                     <Link href="/dashboard/account-settings" className={`d-flex w-100 align-items-center ${pathname === '/dashboard/account-settings' ? 'active' : ''}`}>
                        <Image src={pathname === '/dashboard/account-settings' ? dashboardIconActive_4 : dashboardIcon_4} alt="" />
                        <span>Configurações</span>
                     </Link>
                  </li>
               </ul>
            </nav>

            <div className="profile-complete-status bottom-line pb-35 plr">
               <div className="progress-value fw-500">Fase 1</div>
               <div className="progress-line position-relative">
                  <div className="inner-line" style={{ width: "35%" }}></div>
               </div>
               <p>Gestão dos seus próprios imóveis</p>
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
