"use client"

import { FormEvent, useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Charge = {
  id: string;
  lease_id: string;
  period: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  status: string;
  leases: {
    tenant_id: string | null;
    unit_id: string | null;
    tenants: { name: string } | null;
    units: { name: string; properties: { name: string } | null } | null;
  } | null;
};

type LeaseForGeneration = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  due_day: number | null;
  status: string | null;
};

const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function RentPage() {
  const supabase=createClient();
  const now=new Date();
  const [period,setPeriod]=useState(now.toISOString().slice(0,7));
  const [charges,setCharges]=useState<Charge[]>([]);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [selected,setSelected]=useState<Charge|null>(null);
  const [amount,setAmount]=useState("");
  const [paidAt,setPaidAt]=useState(now.toISOString().slice(0,10));
  const [method,setMethod]=useState("pix");
  const [reference,setReference]=useState("");
  const [notes,setNotes]=useState("");
  const [message,setMessage]=useState("");

  async function loadCharges(){
    setLoading(true);
    const {data,error}=await supabase
      .from("rent_charges")
      .select("id,lease_id,period,due_date,amount,amount_paid,status,leases!rent_charges_lease_id_fkey(tenant_id,unit_id,tenants!leases_tenant_id_fkey(name),units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name))))")
      .eq("period",period)
      .order("due_date");
    if(error){setMessage("Erro ao carregar cobranças: "+error.message);setCharges([])}
    else setCharges((data as unknown as Charge[])??[]);
    setLoading(false);
  }

  useEffect(()=>{loadCharges()},[period]);

  const totals=useMemo(()=>charges.reduce((acc,c)=>{
    acc.charged+=Number(c.amount)||0;
    acc.paid+=Number(c.amount_paid)||0;
    if(c.status==="overdue") acc.overdue+=(Number(c.amount)||0)-(Number(c.amount_paid)||0);
    return acc;
  },{charged:0,paid:0,overdue:0}),[charges]);

  function dueDateFor(period:string,day:number){
    const [y,m]=period.split("-").map(Number);
    const last=new Date(y,m,0).getDate();
    return `${period}-${String(Math.min(day,last)).padStart(2,"0")}`;
  }

  async function generateCharges(){
    setGenerating(true); setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setGenerating(false);setMessage("Você precisa estar logado.");return}

    const {data,error}=await supabase
      .from("leases")
      .select("id,start_date,end_date,rent_amount,due_day,status")
      .in("status",["active","upcoming"]);

    if(error){setGenerating(false);setMessage(error.message);return}

    const firstDay=`${period}-01`;
    const [y,m]=period.split("-").map(Number);
    const lastDay=`${period}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;

    const eligible=((data as LeaseForGeneration[])??[]).filter(l =>
      (!l.start_date || l.start_date<=lastDay) && (!l.end_date || l.end_date>=firstDay)
    );

    if(eligible.length===0){setGenerating(false);setMessage("Não há contratos ativos nesse período.");return}

    const rows=eligible.map(l=>({
      user_id:user.id,
      lease_id:l.id,
      period,
      due_date:dueDateFor(period,l.due_day??1),
      amount:Number(l.rent_amount)||0,
      amount_paid:0,
      status: dueDateFor(period,l.due_day??1) < new Date().toISOString().slice(0,10) ? "overdue":"open",
    }));

    const {error:insertError}=await supabase
      .from("rent_charges")
      .upsert(rows,{onConflict:"lease_id,period",ignoreDuplicates:true});

    setGenerating(false);
    if(insertError){setMessage("Erro ao gerar cobranças: "+insertError.message);return}
    setMessage("Cobranças do período geradas. Contratos já lançados não foram duplicados.");
    await loadCharges();
  }

  function openPayment(c:Charge){
    setSelected(c);
    setAmount(String(Math.max(0,Number(c.amount)-Number(c.amount_paid))));
    setPaidAt(new Date().toISOString().slice(0,10));
    setMethod("pix");setReference("");setNotes("");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function recordPayment(e:FormEvent){
    e.preventDefault();
    if(!selected)return;
    const value=Number(amount.replace(",","."));
    if(!value||value<=0)return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setMessage("Você precisa estar logado.");return}

    const {error}=await supabase.from("payments").insert({
      user_id:user.id,
      lease_id:selected.lease_id,
      charge_id:selected.id,
      amount:value,
      paid_amount:value,
      paid_at:paidAt,
      method,
      reference:reference.trim()||null,
      notes:notes.trim()||null,
      status:"paid",
      due_date:selected.due_date,
    });
    if(error){setMessage("Erro ao registrar pagamento: "+error.message);return}
    setSelected(null);
    setMessage("Pagamento registrado.");
    await loadCharges();
  }

  async function waive(c:Charge){
    if(!window.confirm("Marcar esta cobrança como dispensada/abonada?"))return;
    const {error}=await supabase.from("rent_charges").update({status:"waived"}).eq("id",c.id);
    if(error) alert(error.message); else loadCharges();
  }

  const statusLabel=(s:string)=>s==="paid"?"Pago":s==="partial"?"Parcial":s==="overdue"?"Vencido":s==="waived"?"Abonado":"Em aberto";

  return <Wrapper><div className="dashboard-body"><div className="position-relative">
    <DashboardHeaderTwo title="Financeiro" />
    <h2 className="main-title d-block d-lg-none">Financeiro</h2>

    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-25">
      <div><h4 className="dash-title-two mb-1">Aluguéis e pagamentos</h4><p className="m0">Ledger mensal baseado no modelo do OpenProperty.</p></div>
      <div className="d-flex gap-2 align-items-end">
        <div><label className="d-block mb-1">Competência</label><input type="month" value={period} onChange={e=>setPeriod(e.target.value)} className="form-control"/></div>
        <button className="dash-btn-two tran3s" onClick={generateCharges} disabled={generating}>{generating?"Gerando...":"Gerar cobranças"}</button>
      </div>
    </div>

    {selected && <form onSubmit={recordPayment}><div className="bg-white card-box border-20 mb-40">
      <div className="d-flex justify-content-between"><h4 className="dash-title-three">Registrar pagamento</h4><button type="button" className="btn-close" onClick={()=>setSelected(null)} /></div>
      <p><strong>{selected.leases?.units?.properties?.name ?? "—"} · {selected.leases?.units?.name ?? "—"}</strong> — {selected.leases?.tenants?.name ?? "—"}</p>
      <div className="row">
        <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Valor</label><input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></div></div>
        <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Data do pagamento</label><input type="date" value={paidAt} onChange={e=>setPaidAt(e.target.value)} required/></div></div>
        <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Método</label><select className="nice-select" value={method} onChange={e=>setMethod(e.target.value)}><option value="pix">PIX</option><option value="transfer">Transferência</option><option value="cash">Dinheiro</option><option value="boleto">Boleto</option><option value="credit">Cartão</option><option value="other">Outro</option></select></div></div>
        <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Referência</label><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="ID da transação"/></div></div>
        <div className="col-12"><div className="dash-input-wrapper mb-30"><label>Observações</label><textarea value={notes} onChange={e=>setNotes(e.target.value)}/></div></div>
      </div>
      <button className="dash-btn-two tran3s" type="submit">Registrar pagamento</button>
    </div></form>}

    <div className="row mb-30">
      <div className="col-md-4"><div className="bg-white card-box border-20"><small>Cobrado</small><h3>{money(totals.charged)}</h3></div></div>
      <div className="col-md-4"><div className="bg-white card-box border-20"><small>Recebido</small><h3>{money(totals.paid)}</h3></div></div>
      <div className="col-md-4"><div className="bg-white card-box border-20"><small>Em atraso</small><h3>{money(totals.overdue)}</h3></div></div>
    </div>

    {message && <div className="alert alert-light border">{message}</div>}

    <div className="bg-white card-box border-20"><div className="table-responsive"><table className="table property-list-table">
      <thead><tr><th>Imóvel / Locatário</th><th>Vencimento</th><th>Cobrado</th><th>Recebido</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody className="border-0">
        {loading?<tr><td colSpan={7} className="text-center py-5">Carregando...</td></tr>:
        charges.length===0?<tr><td colSpan={7} className="text-center py-5">Nenhuma cobrança nesta competência. Clique em “Gerar cobranças”.</td></tr>:
        charges.map(c=><tr key={c.id}>
          <td><strong>{c.leases?.units?.properties?.name ?? "—"}</strong> · {c.leases?.units?.name ?? "—"}<br/><small>{c.leases?.tenants?.name ?? "—"}</small></td>
          <td>{new Date(c.due_date+"T12:00:00").toLocaleDateString("pt-BR")}</td>
          <td>{money(Number(c.amount))}</td><td>{money(Number(c.amount_paid))}</td>
          <td>{money(Math.max(0,Number(c.amount)-Number(c.amount_paid)))}</td>
          <td>{statusLabel(c.status)}</td>
          <td><div className="d-flex gap-2">
            {c.status!=="paid"&&c.status!=="waived"&&<button className="btn btn-sm btn-outline-dark" onClick={()=>openPayment(c)}>Receber</button>}
            {c.status!=="paid"&&c.status!=="waived"&&<button className="btn btn-sm btn-outline-secondary" onClick={()=>waive(c)}>Abonar</button>}
          </div></td>
        </tr>)}
      </tbody>
    </table></div></div>
  </div></div></Wrapper>
}
