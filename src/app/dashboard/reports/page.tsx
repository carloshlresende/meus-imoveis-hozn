"use client"

import { useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Charge={amount:number;amount_paid:number;status:string;period:string};
type Expense={amount:number|null;occurred_on:string|null};
type Unit={status:string};
const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function ReportsPage(){
 const supabase=createClient();
 const [charges,setCharges]=useState<Charge[]>([]);
 const [expenses,setExpenses]=useState<Expense[]>([]);
 const [units,setUnits]=useState<Unit[]>([]);
 const [period,setPeriod]=useState(new Date().toISOString().slice(0,7));
 const [message,setMessage]=useState("");

 useEffect(()=>{(async()=>{
  const [c,e,u]=await Promise.all([
    supabase.from("rent_charges").select("amount,amount_paid,status,period"),
    supabase.from("expenses").select("amount,occurred_on"),
    supabase.from("units").select("status")
  ]);
  if(c.error||e.error||u.error)setMessage(c.error?.message||e.error?.message||u.error?.message||"Erro ao carregar.");
  setCharges((c.data??[]) as Charge[]);setExpenses((e.data??[]) as Expense[]);setUnits((u.data??[]) as Unit[]);
 })()},[]);

 const data=useMemo(()=>{
   const c=charges.filter(x=>x.period===period);
   const e=expenses.filter(x=>(x.occurred_on??"").startsWith(period));
   const billed=c.reduce((s,x)=>s+Number(x.amount||0),0);
   const received=c.reduce((s,x)=>s+Number(x.amount_paid||0),0);
   const expense=e.reduce((s,x)=>s+Number(x.amount||0),0);
   const overdue=c.filter(x=>x.status==="overdue").reduce((s,x)=>s+Math.max(Number(x.amount)-Number(x.amount_paid),0),0);
   const occupied=units.filter(x=>x.status==="occupied").length;
   const occupancy=units.length?occupied/units.length*100:0;
   return {billed,received,expense,overdue,result:received-expense,occupancy,open:billed-received};
 },[charges,expenses,units,period]);

 return <Wrapper><div className="dashboard-body"><div className="position-relative">
  <DashboardHeaderTwo title="Relatórios"/>
  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-25">
   <div><h2 className="main-title mb-1">Relatórios</h2><p className="m0">Consolidado financeiro rastreável por competência.</p></div>
   <input type="month" className="form-control" style={{maxWidth:190}} value={period} onChange={e=>setPeriod(e.target.value)}/>
  </div>
  {message&&<div className="alert alert-light border">{message}</div>}
  <div className="row g-3 mb-30">
   {[["Cobrado",data.billed],["Recebido",data.received],["Em aberto",data.open],["Despesas",data.expense],["Resultado",data.result],["Inadimplência",data.overdue]].map(([l,v])=><div className="col-md-4 col-xl-2" key={String(l)}><div className="bg-white card-box border-20 h-100"><small className="text-muted">{l}</small><div className="fw-500 fs-20">{money(Number(v))}</div></div></div>)}
  </div>
  <div className="row g-4">
   <div className="col-lg-7"><div className="bg-white card-box border-20 h-100"><h4 className="dash-title-three">DRE simplificada</h4>
    <div className="d-flex justify-content-between py-3 border-bottom"><span>Receita bruta cobrada</span><strong>{money(data.billed)}</strong></div>
    <div className="d-flex justify-content-between py-3 border-bottom"><span>Receita efetivamente recebida</span><strong>{money(data.received)}</strong></div>
    <div className="d-flex justify-content-between py-3 border-bottom"><span>(-) Despesas operacionais</span><strong>{money(data.expense)}</strong></div>
    <div className="d-flex justify-content-between py-3"><span>Resultado após despesas</span><strong>{money(data.result)}</strong></div>
    <p className="text-muted mt-20 mb-0">O resultado usa recebimentos efetivos menos despesas lançadas na competência; não confunde valor cobrado com caixa recebido.</p>
   </div></div>
   <div className="col-lg-5"><div className="bg-white card-box border-20 h-100"><h4 className="dash-title-three">Ocupação</h4><div className="display-6 fw-500">{data.occupancy.toFixed(1)}%</div><p className="text-muted">Unidades marcadas como ocupadas sobre o total cadastrado.</p><hr/><h5>Inadimplência</h5><div className="fs-3 fw-500">{money(data.overdue)}</div><p className="text-muted mb-0">Saldo de cobranças marcadas como atrasadas.</p></div></div>
  </div>
 </div></div></Wrapper>
}
