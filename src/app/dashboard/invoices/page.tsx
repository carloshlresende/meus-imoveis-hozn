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
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [paymentFilter,setPaymentFilter]=useState("all");

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

  const filteredInvoices=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return invoices.filter(i=>{
      const tenant=i.leases?.tenants?.name??"";
      const property=i.leases?.units?.properties?.name??"";
      const unit=i.leases?.units?.name??"";
      const matchesSearch=!q||[tenant,property,unit,i.period,i.id].some(v=>String(v).toLowerCase().includes(q));
      const matchesStatus=statusFilter==="all"||i.status===statusFilter;
      const matchesPayment=
        paymentFilter==="all"||
        (paymentFilter==="asaas"&&i.payment_mode!=="manual_pix")||
        (paymentFilter==="pix"&&i.payment_mode==="manual_pix");
      return matchesSearch&&matchesStatus&&matchesPayment;
    });
  },[invoices,search,statusFilter,paymentFilter]);

  const hasActiveFilters=Boolean(search.trim()||statusFilter!=="all"||paymentFilter!=="all");

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

  const statusStyle=(status:string)=>{
    if(status==="paid") return {background:"#e9f8ef",color:"#16794a"};
    if(status==="overdue") return {background:"#fff0f0",color:"#c53030"};
    if(status==="cancelled") return {background:"#f1f1f1",color:"#6b7280"};
    if(status==="issued") return {background:"#eef4ff",color:"#315ea8"};
    return {background:"#fff8e6",color:"#946200"};
  };

  const referenceLabel=(p:string)=>{
    const [y,m]=p.split("-");
    return `${m}/${y}`;
  };

  function clearFilters(){
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
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

    <div className="bg-white card-box border-20 p-0 overflow-hidden">
      <div className="p-3 p-lg-4 border-bottom">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div className="d-flex flex-wrap gap-2">
            <div>
              <label className="d-block mb-1 small">Situação</label>
              <select className="form-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option value="all">Todas</option>
                <option value="pending">Aguardando pagamento</option>
                <option value="issued">Emitida</option>
                <option value="paid">Paga</option>
                <option value="overdue">Vencida</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="d-block mb-1 small">Forma de pagamento</label>
              <select className="form-select" value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)}>
                <option value="all">Todas</option>
                <option value="asaas">Asaas / boleto</option>
                <option value="pix">PIX manual</option>
              </select>
            </div>
          </div>

          <div style={{minWidth:280}}>
            <label className="d-block mb-1 small">Pesquisar</label>
            <input
              className="form-control"
              type="search"
              placeholder="Inquilino, imóvel, referência..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {hasActiveFilters&&(
        <div className="px-3 px-lg-4 py-2 border-bottom d-flex flex-wrap align-items-center gap-2">
          <strong className="me-1">Filtros ativos</strong>
          {statusFilter!=="all"&&(
            <span className="badge rounded-pill text-bg-light border">
              Situação: {statusLabel(statusFilter)}
            </span>
          )}
          {paymentFilter!=="all"&&(
            <span className="badge rounded-pill text-bg-light border">
              Pagamento: {paymentFilter==="pix"?"PIX manual":"Asaas / boleto"}
            </span>
          )}
          {search.trim()&&(
            <span className="badge rounded-pill text-bg-light border">
              Busca: {search}
            </span>
          )}
          <button className="btn btn-sm btn-link text-decoration-none" onClick={clearFilters}>Limpar</button>
        </div>
      )}

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr style={{background:"#050505",color:"#fff"}}>
              <th className="px-3 py-3">Ações</th>
              <th className="px-3 py-3 text-center">Cobrança</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Inquilino</th>
              <th className="px-3 py-3">Contrato / Imóvel</th>
              <th className="px-3 py-3">Valor total</th>
              <th className="px-3 py-3">Referência</th>
              <th className="px-3 py-3">Vencimento</th>
              <th className="px-3 py-3">Forma de pagamento</th>
              <th className="px-3 py-3">Situação</th>
              <th className="px-3 py-3">WhatsApp</th>
            </tr>
          </thead>

          <tbody>
            {loading?(
              <tr><td colSpan={11} className="text-center py-5">Carregando faturas...</td></tr>
            ):filteredInvoices.length===0?(
              <tr><td colSpan={11} className="text-center py-5">Nenhuma fatura encontrada.</td></tr>
            ):filteredInvoices.map(i=>(
              <tr key={i.id}>
                <td className="px-3 py-3">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-link p-0 text-decoration-none" onClick={()=>{}}>
                      👁 Visualizar
                    </button>

                    {i.payment_mode!=="manual_pix"&&!i.asaas_payment_id&&i.status!=="paid"&&(
                      <button className="btn btn-sm btn-link p-0 text-decoration-none" disabled={issuingId===i.id} onClick={()=>issueAsaas(i)}>
                        {issuingId===i.id?"Emitindo...":"Gerar boleto"}
                      </button>
                    )}

                    {i.payment_mode!=="manual_pix"&&!i.asaas_payment_id&&i.status!=="paid"&&(
                      <button className="btn btn-sm btn-link p-0 text-decoration-none" onClick={()=>markManualPix(i)}>
                        Usar PIX
                      </button>
                    )}

                    {i.payment_mode==="manual_pix"&&i.status!=="paid"&&(
                      <button className="btn btn-sm btn-link p-0 text-decoration-none" onClick={()=>markManualPix(i)}>
                        Editar PIX
                      </button>
                    )}
                  </div>
                </td>

                <td className="px-3 py-3 text-center">
                  {i.asaas_bank_slip_url?(
                    <a href={i.asaas_bank_slip_url} target="_blank" rel="noreferrer" title="Abrir boleto" style={{fontSize:20}}>✅</a>
                  ):i.payment_mode==="manual_pix"?(
                    <span title="PIX sem boleto" style={{fontSize:20}}>—</span>
                  ):(
                    <span title="Boleto ainda não emitido" style={{fontSize:20}}>❌</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <small>{i.id.slice(0,8).toUpperCase()}</small>
                </td>

                <td className="px-3 py-3">
                  <strong>{i.leases?.tenants?.name??"—"}</strong>
                </td>

                <td className="px-3 py-3">
                  <strong>{i.leases?.units?.properties?.name??"—"}</strong>
                  <br/><small>{i.leases?.units?.name??"—"}</small>
                </td>

                <td className="px-3 py-3"><strong>{money(i.total)}</strong></td>

                <td className="px-3 py-3">{referenceLabel(i.period)}</td>

                <td className="px-3 py-3">
                  {new Date(i.due_date+"T12:00:00").toLocaleDateString("pt-BR")}
                </td>

                <td className="px-3 py-3">
                  {i.payment_mode==="manual_pix"
                    ?"PIX"
                    :"Asaas (Boleto/PIX automatizado)"}
                </td>

                <td className="px-3 py-3">
                  <span style={{
                    ...statusStyle(i.status),
                    display:"inline-block",
                    padding:"5px 10px",
                    borderRadius:999,
                    fontSize:12,
                    fontWeight:600,
                    whiteSpace:"nowrap"
                  }}>
                    {statusLabel(i.status)}
                  </span>
                </td>

                <td className="px-3 py-3">
                  {i.whatsapp_status==="read"?"🟢 Visualizado":
                   i.whatsapp_status==="delivered"?"🟡 Entregue":
                   i.whatsapp_status==="sent"?"🔵 Enviado":
                   "⚪ Não enviado"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

  </div></div></Wrapper>
}