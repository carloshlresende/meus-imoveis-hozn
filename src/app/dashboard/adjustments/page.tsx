"use client"

import { FormEvent, useEffect, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Lease={id:string;rent_amount:number|null;adjustment_index:string|null;units:{name:string;properties:{name:string}|null}|null;tenants:{name:string}|null};
type Adjustment={id:string;lease_id:string;adjustment_index:string;accumulated_percent:number;effective_date:string;previous_rent:number;new_rent:number;status:string;notes:string|null;leases:Lease|null};
const money=(v:number|null|undefined)=>Number(v??0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function AdjustmentsPage(){
 const supabase=createClient();
 const [leases,setLeases]=useState<Lease[]>([]);
 const [items,setItems]=useState<Adjustment[]>([]);
 const [leaseId,setLeaseId]=useState("");
 const [index,setIndex]=useState("IPCA");
 const [percent,setPercent]=useState("");
 const [effectiveDate,setEffectiveDate]=useState(new Date().toISOString().slice(0,10));
 const [notes,setNotes]=useState("");
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);

 async function load(){
   const [l,a]=await Promise.all([
    supabase.from("leases").select("id,rent_amount,adjustment_index,units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name)),tenants!leases_tenant_id_fkey(name)").eq("status","active").order("created_at",{ascending:false}),
    supabase.from("rent_adjustments").select("id,lease_id,adjustment_index,accumulated_percent,effective_date,previous_rent,new_rent,status,notes,leases!rent_adjustments_lease_id_fkey(id,rent_amount,adjustment_index,units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name)),tenants!leases_tenant_id_fkey(name))").order("effective_date",{ascending:false})
   ]);
   if(l.error||a.error)setMessage(l.error?.message||a.error?.message||"Erro ao carregar.");
   setLeases((l.data as unknown as Lease[])??[]);setItems((a.data as unknown as Adjustment[])??[]);
 }
 useEffect(()=>{load()},[]);

 async function submit(e:FormEvent){
   e.preventDefault(); const lease=leases.find(l=>l.id===leaseId); if(!lease)return;
   setSaving(true);setMessage("");
   const {data:{user}}=await supabase.auth.getUser(); if(!user){setSaving(false);return;}
   const p=Number(percent.replace(",","."));
   const previous=Number(lease.rent_amount??0);
   const next=Math.round(previous*(1+p/100)*100)/100;
   const {error}=await supabase.from("rent_adjustments").insert({
     user_id:user.id,lease_id:leaseId,adjustment_index:index,accumulated_percent:p,effective_date:effectiveDate,
     previous_rent:previous,new_rent:next,status:"planned",notes:notes.trim()||null
   });
   setSaving(false);
   if(error){setMessage("Erro ao registrar reajuste: "+error.message);return;}
   setLeaseId("");setPercent("");setNotes("");await load();
 }

 async function apply(a:Adjustment){
   if(!confirm(`Aplicar reajuste e alterar o aluguel de ${money(a.previous_rent)} para ${money(a.new_rent)}?`))return;
   const {error:e1}=await supabase.from("leases").update({rent_amount:a.new_rent,adjustment_index:a.adjustment_index}).eq("id",a.lease_id);
   const {error:e2}=await supabase.from("rent_adjustments").update({status:"applied"}).eq("id",a.id);
   if(e1||e2)alert("Erro ao aplicar reajuste: "+(e1?.message||e2?.message)); else await load();
 }

 const selected=leases.find(l=>l.id===leaseId);
 const preview=selected&&percent!==""?Number(selected.rent_amount??0)*(1+Number(percent.replace(",","."))/100):null;

 return <Wrapper><div className="dashboard-body"><div className="position-relative">
  <DashboardHeaderTwo title="Reajustes" />
  <h2 className="main-title mb-1">Reajustes</h2><p className="mb-25">Registre a decisão, visualize o impacto e aplique a nova vigência de forma explícita.</p>
  <form onSubmit={submit}><div className="bg-white card-box border-20 mb-30"><h4 className="dash-title-three">Novo reajuste</h4><div className="row">
   <div className="col-md-5"><div className="dash-input-wrapper mb-25"><label>Locação*</label><select className="nice-select" required value={leaseId} onChange={e=>{setLeaseId(e.target.value);const l=leases.find(x=>x.id===e.target.value);if(l?.adjustment_index)setIndex(l.adjustment_index)}}><option value="">Selecione</option>{leases.map(l=><option key={l.id} value={l.id}>{l.units?.properties?.name??"Imóvel"} · {l.units?.name??"Unidade"} · {l.tenants?.name??"Locatário"}</option>)}</select></div></div>
   <div className="col-md-2"><div className="dash-input-wrapper mb-25"><label>Índice</label><select className="nice-select" value={index} onChange={e=>setIndex(e.target.value)}><option>IPCA</option><option>IGP-M</option><option>INPC</option><option>Negociado</option></select></div></div>
   <div className="col-md-2"><div className="dash-input-wrapper mb-25"><label>Percentual*</label><input type="number" step="0.0001" required value={percent} onChange={e=>setPercent(e.target.value)}/></div></div>
   <div className="col-md-3"><div className="dash-input-wrapper mb-25"><label>Vigência*</label><input type="date" required value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/></div></div>
   <div className="col-12"><div className="dash-input-wrapper mb-25"><label>Observações</label><textarea value={notes} onChange={e=>setNotes(e.target.value)}/></div></div>
  </div>
  {selected&&<div className="alert alert-light border">Prévia: {money(selected.rent_amount)} → <strong>{money(preview)}</strong>. O aluguel só muda quando você clicar em Aplicar.</div>}
  {message&&<p>{message}</p>}<button className="dash-btn-two tran3s" disabled={saving}>{saving?"Salvando...":"Registrar reajuste"}</button>
  </div></form>

  <div className="bg-white card-box border-20"><div className="table-responsive"><table className="table"><thead><tr><th>Locação</th><th>Índice</th><th>Vigência</th><th>Antes</th><th>Depois</th><th>Status</th><th></th></tr></thead><tbody>
   {items.length?items.map(a=><tr key={a.id}><td><strong>{a.leases?.units?.properties?.name??"—"}</strong><br/><small>{a.leases?.tenants?.name??"—"}</small></td><td>{a.adjustment_index} · {a.accumulated_percent}%</td><td>{new Date(a.effective_date+"T12:00:00").toLocaleDateString("pt-BR")}</td><td>{money(a.previous_rent)}</td><td>{money(a.new_rent)}</td><td>{a.status==="planned"?"Planejado":a.status==="applied"?"Aplicado":"Cancelado"}</td><td>{a.status==="planned"&&<button className="btn btn-sm btn-outline-dark" onClick={()=>apply(a)}>Aplicar</button>}</td></tr>):<tr><td colSpan={7} className="text-center py-5">Nenhum reajuste registrado.</td></tr>}
  </tbody></table></div></div>
 </div></div></Wrapper>
}
