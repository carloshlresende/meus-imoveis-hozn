"use client"

import { FormEvent, useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Property={id:string;name:string};
type Expense={id:string;property_id:string|null;description:string;category:string|null;amount:number|null;due_date:string|null;paid_at:string|null;occurred_on:string|null;properties:{name:string}|null};

const categories=["Manutenção","Reforma","Condomínio de unidade vaga","IPTU","Administração","Jurídico","Aquisição / escritura / corretagem","Outros"];
const money=(v:number|null)=>Number(v??0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function ExpensesPage(){
 const supabase=createClient();
 const [properties,setProperties]=useState<Property[]>([]);
 const [expenses,setExpenses]=useState<Expense[]>([]);
 const [propertyId,setPropertyId]=useState("");
 const [description,setDescription]=useState("");
 const [category,setCategory]=useState(categories[0]);
 const [amount,setAmount]=useState("");
 const [occurredOn,setOccurredOn]=useState(new Date().toISOString().slice(0,10));
 const [dueDate,setDueDate]=useState("");
 const [recurring,setRecurring]=useState(false);
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);

 async function load(){
   const [p,e]=await Promise.all([
     supabase.from("properties").select("id,name").is("archived_at",null).order("name"),
     supabase.from("expenses").select("id,property_id,description,category,amount,due_date,paid_at,occurred_on,properties(name)").order("occurred_on",{ascending:false})
   ]);
   if(p.error||e.error) setMessage(p.error?.message||e.error?.message||"Erro ao carregar.");
   setProperties((p.data as Property[])??[]);
   setExpenses((e.data as unknown as Expense[])??[]);
 }
 useEffect(()=>{load()},[]);

 const total=useMemo(()=>expenses.reduce((s,e)=>s+Number(e.amount??0),0),[expenses]);

 async function submit(ev:FormEvent){
   ev.preventDefault(); if(!propertyId)return; setSaving(true);setMessage("");
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setSaving(false);return;}
   let recurringRuleId:string|null=null;
   if(recurring){
     const day=Number((dueDate||occurredOn).slice(-2))||1;
     const {data,error}=await supabase.from("expense_recurring_rules").insert({
       user_id:user.id,property_id:propertyId,amount:Number(amount.replace(",","."))||0,category,
       description:description.trim(),day_of_month:Math.min(31,Math.max(1,day)),starts_on:occurredOn
     }).select("id").single();
     if(error){setSaving(false);setMessage("Erro ao criar recorrência: "+error.message);return;}
     recurringRuleId=data.id;
   }
   const {error}=await supabase.from("expenses").insert({
     user_id:user.id,property_id:propertyId,description:description.trim(),category,
     amount:Number(amount.replace(",","."))||0,due_date:dueDate||null,occurred_on:occurredOn,recurring_rule_id:recurringRuleId
   });
   setSaving(false);
   if(error){setMessage("Erro ao salvar despesa: "+error.message);return;}
   setDescription("");setAmount("");setDueDate("");setRecurring(false);await load();
 }

 return <Wrapper><div className="dashboard-body"><div className="position-relative">
  <DashboardHeaderTwo title="Despesas" />
  <div className="d-flex justify-content-between align-items-center mb-25"><div><h2 className="main-title mb-1">Despesas</h2><p className="m0">Custos da carteira, separados das cobranças feitas ao inquilino.</p></div><strong>{money(total)}</strong></div>
  <form onSubmit={submit}><div className="bg-white card-box border-20 mb-30">
   <h4 className="dash-title-three">Nova despesa</h4>
   {properties.length===0?<div className="alert alert-light border">Cadastre um imóvel antes de lançar despesas.</div>:<div className="row">
    <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Imóvel*</label><select className="nice-select" required value={propertyId} onChange={e=>setPropertyId(e.target.value)}><option value="">Selecione</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
    <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Categoria</label><select className="nice-select" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div></div>
    <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Valor*</label><input type="number" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></div></div>
    <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Data</label><input type="date" value={occurredOn} onChange={e=>setOccurredOn(e.target.value)}/></div></div>
    <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Vencimento</label><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div></div>
    <div className="col-md-4 d-flex align-items-center"><label className="d-flex gap-2 align-items-center mt-3"><input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/> Criar regra mensal recorrente</label></div>
    <div className="col-12"><div className="dash-input-wrapper mb-25"><label>Descrição*</label><input required value={description} onChange={e=>setDescription(e.target.value)}/></div></div>
   </div>}
   {message&&<p>{message}</p>}
   {properties.length>0&&<button className="dash-btn-two tran3s" disabled={saving}>{saving?"Salvando...":"Salvar despesa"}</button>}
  </div></form>
  <div className="bg-white card-box border-20"><div className="table-responsive"><table className="table"><thead><tr><th>Data</th><th>Imóvel</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>
   {expenses.length?expenses.map(e=><tr key={e.id}><td>{e.occurred_on?new Date(e.occurred_on+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td><td>{e.properties?.name??"—"}</td><td>{e.category??"—"}</td><td>{e.description}</td><td>{money(e.amount)}</td></tr>):<tr><td colSpan={5} className="text-center py-5">Nenhuma despesa lançada.</td></tr>}
  </tbody></table></div></div>
 </div></div></Wrapper>
}
