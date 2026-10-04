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

type ContractOption = {
  id: string;
  tenant_id: string | null;
  property_id: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  due_day: number | null;
  status: string | null;
  tenants: { name: string } | null;
  units: { name: string; properties: { name: string } | null } | null;
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
  const [contracts,setContracts]=useState<ContractOption[]>([]);
  const [selectedContracts,setSelectedContracts]=useState<string[]>([]);

  async function loadContracts(){
    const {data,error}=await supabase
      .from("leases")
      .select("id,tenant_id,property_id,start_date,end_date,rent_amount,due_day,status,tenants!leases_tenant_id_fkey(name),units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name))")
      .in("status",["active","upcoming"])
      .order("created_at");

    if(error){
      setMessage("Erro ao carregar contratos: "+error.message);
      setContracts([]);
      return;
    }

    const rows=(data as unknown as ContractOption[])??[];
    setContracts(rows);

    setSelectedContracts(prev=>{
      if(prev.length>0) return prev.filter(id=>rows.some(r=>r.id===id));
      return rows.map(r=>r.id);
    });
  }

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

  useEffect(()=>{
    loadContracts();
    loadInvoices();
  },[period]);

  const totals=useMemo(()=>invoices.reduce((acc,i)=>{
    acc.total+=Number(i.total)||0;
    if(i.status==="paid") acc.paid+=Number(i.total)||0;
    if(i.status==="overdue") acc.overdue+=Number(i.total)||0;
    return acc;
  },{total:0,paid:0,overdue:0}),[invoices]);

  function toggleContract(id:string){
    setSelectedContracts(prev=>
      prev.includes(id)
        ? prev.filter(x=>x!==id)
        : [...prev,id]
    );
  }

  function toggleAllContracts(){
    setSelectedContracts(prev=>
      prev.length===contracts.length ? [] : contracts.map(c=>c.id)
    );
  }

  async function generateInvoices(){
    setGenerating(true);
    setMessage("");

    const {data:{user}}=await supabase.auth.getUser();
    if(!user){
      setGenerating(false);
      setMessage("Você precisa estar logado.");
      return;
    }

    if(selectedContracts.length===0){
      setGenerating(false);
      setMessage("Selecione pelo menos um contrato para gerar faturas.");
      return;
    }

    const selectedLeaseRows=contracts.filter(c=>selectedContracts.includes(c.id));

    const firstDay=`${period}-01`;
    const [year,month]=period.split("-").map(Number);
    const lastDay=`${period}-${String(new Date(year,month,0).getDate()).padStart(2,"0")}`;

    const eligibleContracts=selectedLeaseRows.filter(c=>
      (!c.start_date || c.start_date<=lastDay) &&
      (!c.end_date || c.end_date>=firstDay)
    );

    if(eligibleContracts.length===0){
      setGenerating(false);
      setMessage("Nenhum dos contratos selecionados está vigente nesta competência.");
      return;
    }

    const dueDateFor=(day:number)=>{
      const last=new Date(year,month,0).getDate();
      return `${period}-${String(Math.min(Math.max(day||1,1),last)).padStart(2,"0")}`;
    };

    const chargeRows=eligibleContracts.map(c=>({
      user_id:user.id,
      lease_id:c.id,
      period,
      due_date:dueDateFor(c.due_day??1),
      amount:Number(c.rent_amount)||0,
      amount_paid:0,
      status:dueDateFor(c.due_day??1)<new Date().toISOString().slice(0,10)?"overdue":"open",
    }));

    const {error:chargeUpsertError}=await supabase
      .from("rent_charges")
      .upsert(chargeRows,{onConflict:"lease_id,period",ignoreDuplicates:true});

    if(chargeUpsertError){
      setGenerating(false);
      setMessage("Erro ao preparar cobranças mensais: "+chargeUpsertError.message);
      return;
    }

    const {data:charges,error}=await supabase
      .from("rent_charges")
      .select("id,lease_id,period,due_date,amount,status,leases!rent_charges_lease_id_fkey(property_id,tenant_id,tenants!leases_tenant_id_fkey(name),units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name)))")
      .eq("period",period)
      .in("lease_id",eligibleContracts.map(c=>c.id));

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

    const {error:insertError}=await supabase
      .from("invoices")
      .upsert(rows,{onConflict:"rent_charge_id",ignoreDuplicates:true});

    setGenerating(false);

    if(insertError){
      setMessage("Erro ao gerar faturas: "+insertError.message);
      return;
    }

    setMessage("Faturas geradas. As cobranças mensais faltantes foram criadas automaticamente e nenhuma fatura foi duplicada.");
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

    <div className="bg-white card-box border-20 mb-30">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-20">
        <div>
          <h4 className="dash-title-three mb-1">Contratos para faturar</h4>
          <p className="m0">Selecione quais contratos devem gerar faturas nesta competência.</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={toggleAllContracts}>
          {selectedContracts.length===contracts.length&&contracts.length>0?"Desmarcar todos":"Selecionar todos"}
        </button>
      </div>

      {contracts.length===0 ? (
        <div className="alert alert-light border mb-0">Nenhum contrato ativo ou futuro encontrado.</div>
      ) : (
        <div className="row">
          {contracts.map(contract=>(
            <div key={contract.id} className="col-lg-6 mb-3">
              <label
                className="d-flex align-items-start gap-3 p-3 border rounded"
                style={{cursor:"pointer"}}
              >
                <input
                  type="checkbox"
                  checked={selectedContracts.includes(contract.id)}
                  onChange={()=>toggleContract(contract.id)}
                  style={{marginTop:4}}
                />
                <span>
                  <strong>{contract.units?.properties?.name??"Imóvel"}</strong>
                  {" · "}
                  {contract.units?.name??"Unidade"}
                  <br/>
                  <small>Locatário: {contract.tenants?.name??"—"}</small>
                </span>
              </label>
            </div>
          ))}
        </div>
      )}
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
