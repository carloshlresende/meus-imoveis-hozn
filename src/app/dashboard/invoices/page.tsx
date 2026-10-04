"use client"

import { useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Charge = {
  id: string;
  lease_id: string;
  period: string;
  due_date: string;
  amount: number;
  status: string;
  leases: {
    property_id: string | null;
    tenant_id: string | null;
    tenants: { name: string } | null;
    units: { name: string; properties: { name: string } | null } | null;
  } | null;
};

type Invoice = {
  id: string;
  lease_id: string;
  rent_charge_id: string | null;
  tenant_id: string | null;
  property_id: string | null;
  period: string;
  due_date: string;
  subtotal: number;
  adjustments: number;
  total: number;
  status: string;
  asaas_payment_id: string | null;
  asaas_status: string | null;
  asaas_invoice_url: string | null;
  asaas_bank_slip_url: string | null;
  issued_at: string | null;
  paid_at: string | null;
  whatsapp_status: string | null;
  payment_mode: string;
  manual_pix_key: string | null;
  manual_payment_instructions: string | null;
  leases: {
    tenants: { name: string } | null;
    units: { name: string; properties: { name: string } | null } | null;
  } | null;
};

const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const statusLabel=(status:string)=>{
  if(status==="issued") return "Emitida";
  if(status==="paid") return "Paga";
  if(status==="overdue") return "Vencida";
  if(status==="cancelled") return "Cancelada";
  return "Pendente";
};

export default function InvoicesPage(){
  const supabase=createClient();
  const now=new Date();
  const [period,setPeriod]=useState(now.toISOString().slice(0,7));
  const [invoices,setInvoices]=useState<Invoice[]>([]);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [issuingId,setIssuingId]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  async function loadInvoices(){
    setLoading(true);
    const {data,error}=await supabase
      .from("invoices")
      .select("id,lease_id,rent_charge_id,tenant_id,property_id,period,due_date,subtotal,adjustments,total,status,asaas_payment_id,asaas_status,asaas_invoice_url,asaas_bank_slip_url,issued_at,paid_at,whatsapp_status,payment_mode,manual_pix_key,manual_payment_instructions,leases!invoices_lease_id_fkey(tenants!leases_tenant_id_fkey(name),units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name)))")
      .eq("period",period)
      .order("due_date");

    if(error){
      setMessage("Erro ao carregar faturas: "+error.message);
      setInvoices([]);
    }else{
      setInvoices((data as unknown as Invoice[])??[]);
    }
    setLoading(false);
  }

  useEffect(()=>{loadInvoices()},[period]);

  const totals=useMemo(()=>invoices.reduce((acc,i)=>{
    acc.total+=Number(i.total)||0;
    if(i.status==="paid") acc.paid+=Number(i.total)||0;
    if(i.status==="overdue") acc.overdue+=Number(i.total)||0;
    return acc;
  },{total:0,paid:0,overdue:0}),[invoices]);

  async function generateInvoices(){
    setGenerating(true);
    setMessage("");

    const {data:{user}}=await supabase.auth.getUser();
    if(!user){
      setGenerating(false);
      setMessage("Você precisa estar logado.");
      return;
    }

    const {data:charges,error}=await supabase
      .from("rent_charges")
      .select("id,lease_id,period,due_date,amount,status,leases!rent_charges_lease_id_fkey(property_id,tenant_id,tenants!leases_tenant_id_fkey(name),units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name)))")
      .eq("period",period);

    if(error){
      setGenerating(false);
      setMessage("Erro ao buscar cobranças: "+error.message);
      return;
    }

    const rows=((charges as unknown as Charge[])??[])
      .filter(c=>c.status!=="waived")
      .map(c=>({
        user_id:user.id,
        lease_id:c.lease_id,
        rent_charge_id:c.id,
        tenant_id:c.leases?.tenant_id??null,
        property_id:c.leases?.property_id??null,
        period:c.period,
        due_date:c.due_date,
        subtotal:Number(c.amount)||0,
        adjustments:0,
        total:Number(c.amount)||0,
        description:`Aluguel - competência ${c.period}`,
        status:c.status==="paid"?"paid":c.status==="overdue"?"overdue":"pending",
        payment_mode:"asaas_boleto",
        updated_at:new Date().toISOString(),
      }));

    if(rows.length===0){
      setGenerating(false);
      setMessage("Não existem cobranças dessa competência. Gere primeiro as cobranças mensais.");
      return;
    }

    const {error:insertError}=await supabase
      .from("invoices")
      .upsert(rows,{onConflict:"rent_charge_id",ignoreDuplicates:true});

    setGenerating(false);

    if(insertError){
      setMessage("Erro ao gerar faturas: "+insertError.message);
      return;
    }

    setMessage("Faturas geradas. Cobranças já faturadas não foram duplicadas.");
    await loadInvoices();
  }

  async function markManualPix(invoice:Invoice){
    const pixKey=window.prompt("Informe a chave PIX que aparecerá na fatura:");
    if(pixKey===null)return;

    const instructions=window.prompt(
      "Instruções adicionais (opcional):",
      "Pagamento via PIX. Após o pagamento, envie o comprovante."
    );

    const {error}=await supabase
      .from("invoices")
      .update({
        payment_mode:"manual_pix",
        manual_pix_key:pixKey.trim()||null,
        manual_payment_instructions:instructions?.trim()||null,
        status:invoice.status==="pending"?"issued":invoice.status,
        issued_at:invoice.issued_at??new Date().toISOString(),
        updated_at:new Date().toISOString(),
      })
      .eq("id",invoice.id);

    if(error){
      setMessage("Erro ao configurar PIX manual: "+error.message);
      return;
    }

    setMessage("Fatura configurada para pagamento por PIX manual, sem boleto Asaas.");
    await loadInvoices();
  }

  async function switchToAsaas(invoice:Invoice){
    const {error}=await supabase
      .from("invoices")
      .update({
        payment_mode:"asaas_boleto",
        manual_pix_key:null,
        manual_payment_instructions:null,
        updated_at:new Date().toISOString(),
      })
      .eq("id",invoice.id);

    if(error){
      setMessage("Erro ao alterar forma de pagamento: "+error.message);
      return;
    }

    await loadInvoices();
  }

  async function issueAsaas(invoice:Invoice){
    setIssuingId(invoice.id);
    setMessage("");

    const {data,error}=await supabase.functions.invoke("asaas-create-charge",{
      body:{invoice_id:invoice.id}
    });

    setIssuingId(null);

    if(error){
      setMessage("Não foi possível chamar a integração Asaas: "+error.message);
      return;
    }

    if(data?.error){
      const detail=data?.details?.errors?.[0]?.description;
      setMessage(data.error+(detail?" "+detail:""));
      return;
    }

    setMessage(data?.already_created
      ?"Este boleto já havia sido criado no Asaas."
      :"Boleto criado no Asaas Sandbox e vinculado à fatura.");
    await loadInvoices();
  }

  async function refresh(){
    await loadInvoices();
    setMessage("Faturas atualizadas.");
  }

  return <Wrapper><div className="dashboard-body"><div className="position-relative">
    <DashboardHeaderTwo title="Faturas"/>
    <h2 className="main-title d-block d-lg-none">Faturas</h2>

    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-25">
      <div>
        <h4 className="dash-title-two mb-1">Faturas de locação</h4>
        <p className="m0">Emissão mensal, boleto Asaas e conciliação automática.</p>
      </div>
      <div className="d-flex flex-wrap gap-2 align-items-end">
        <div>
          <label className="d-block mb-1">Competência</label>
          <input type="month" className="form-control" value={period} onChange={e=>setPeriod(e.target.value)}/>
        </div>
        <button className="btn btn-outline-dark" onClick={refresh}>Atualizar</button>
        <button className="dash-btn-two tran3s" onClick={generateInvoices} disabled={generating}>
          {generating?"Gerando...":"Gerar faturas do mês"}
        </button>
      </div>
    </div>

    <div className="row mb-30">
      <div className="col-md-4"><div className="bg-white card-box border-20"><small>Total faturado</small><h3>{money(totals.total)}</h3></div></div>
      <div className="col-md-4"><div className="bg-white card-box border-20"><small>Pago</small><h3>{money(totals.paid)}</h3></div></div>
      <div className="col-md-4"><div className="bg-white card-box border-20"><small>Vencido</small><h3>{money(totals.overdue)}</h3></div></div>
    </div>

    {message&&<div className="alert alert-light border mb-25">{message}</div>}

    <div className="bg-white card-box border-20">
      <div className="table-responsive">
        <table className="table property-list-table">
          <thead>
            <tr><th>Imóvel / Locatário</th><th>Vencimento</th><th>Valor</th><th>Fatura</th><th>Asaas</th><th>WhatsApp</th><th>Ações</th></tr>
          </thead>
          <tbody className="border-0">
            {loading?<tr><td colSpan={7} className="text-center py-5">Carregando faturas...</td></tr>:
            invoices.length===0?<tr><td colSpan={7} className="text-center py-5">Nenhuma fatura nesta competência.</td></tr>:
            invoices.map(i=><tr key={i.id}>
              <td>
                <strong>{i.leases?.units?.properties?.name??"—"}</strong> · {i.leases?.units?.name??"—"}
                <br/><small>{i.leases?.tenants?.name??"—"}</small>
              </td>
              <td>{new Date(i.due_date+"T12:00:00").toLocaleDateString("pt-BR")}</td>
              <td><strong>{money(i.total)}</strong></td>
              <td>{statusLabel(i.status)}</td>
              <td>
                {i.payment_mode==="manual_pix"
                  ? <><strong>PIX manual</strong>{i.manual_pix_key&&<><br/><small>{i.manual_pix_key}</small></>}</>
                  : i.asaas_payment_id
                    ? <><span>{i.asaas_status||"Criado"}</span><br/><small>{i.asaas_payment_id}</small></>
                    : <span>Boleto não emitido</span>}
              </td>
              <td>{i.whatsapp_status||"Não enviado"}</td>
              <td>
                <div className="d-flex gap-2 flex-wrap">
                  {i.payment_mode!=="manual_pix"&&!i.asaas_payment_id&&i.status!=="paid"&&
                    <button className="btn btn-sm btn-dark" disabled={issuingId===i.id} onClick={()=>issueAsaas(i)}>
                      {issuingId===i.id?"Emitindo...":"Gerar boleto"}
                    </button>}

                  {i.payment_mode!=="manual_pix"&&!i.asaas_payment_id&&i.status!=="paid"&&
                    <button className="btn btn-sm btn-outline-dark" onClick={()=>markManualPix(i)}>
                      Usar PIX sem boleto
                    </button>}

                  {i.payment_mode==="manual_pix"&&i.status!=="paid"&&
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>markManualPix(i)}>
                      Editar PIX
                    </button>}

                  {i.payment_mode==="manual_pix"&&!i.asaas_payment_id&&i.status!=="paid"&&
                    <button className="btn btn-sm btn-outline-dark" onClick={()=>switchToAsaas(i)}>
                      Trocar para boleto
                    </button>}

                  {i.asaas_bank_slip_url&&
                    <a className="btn btn-sm btn-outline-dark" href={i.asaas_bank_slip_url} target="_blank" rel="noreferrer">Boleto</a>}
                  {i.asaas_invoice_url&&
                    <a className="btn btn-sm btn-outline-secondary" href={i.asaas_invoice_url} target="_blank" rel="noreferrer">Asaas</a>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </div></div></Wrapper>
}
