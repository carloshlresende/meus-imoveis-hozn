"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Tab="overview"|"owners"|"rental"|"finance"|"expenses"|"documents"|"field"|"utilities";
type PropertyRow={id:string;name:string;address:string;city:string|null;state:string|null;type:string|null;area:number|null;bedrooms:number|null;bathrooms:number|null;estimated_value:number|null;status:string|null;archived_at:string|null;image_url:string|null;water_provider:string|null;water_account_number:string|null;electricity_provider:string|null;electricity_account_number:string|null;utility_transfer_notes:string|null;expected_rent:number|null;current_value:number|null;purchase_price:number|null;acquisition_date:string|null;description:string|null;notes:string|null};
type UnitRow={id:string;name:string;status:string|null;market_rent:number|null};
type LeaseRow={id:string;unit_id:string|null;start_date:string|null;end_date:string|null;rent_amount:number|null;due_day:number|null;status:string|null;deposit:number|null};
type TenantRow={id:string;name:string;email:string|null;phone:string|null};
type ChargeRow={id:string;lease_id:string;period:string;due_date:string|null;amount:number;amount_paid:number;status:string};
type InvoiceRow={id:string;period:string;due_date:string;total:number;status:string};
type DocumentRow={id:string;name:string;document_type:string|null;created_at:string};
type Owner={id:string;name:string;document:string|null;email:string|null;phone:string|null};
type Ownership={id:string;owner_id:string;ownership_percent:number;is_primary:boolean};
type Expense={id:string;description:string;category:string|null;amount:number|null;occurred_on:string|null};
type PropertyKey={id:string;name:string;key_type:string;board_position:string|null;copies:number;notes:string|null};
type Inspection={id:string;inspection_type:string;status:string;scheduled_at:string|null};

const money=(v:number|null|undefined)=>Number(v??0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const date=(v:string|null|undefined)=>v?new Date(v+(v.length===10?"T12:00:00":"")).toLocaleDateString("pt-BR"):"—";
const statusLabel=(s:string|null|undefined)=>({vacant:"Vago",rented:"Alugado",occupied:"Ocupado",turnover:"Em preparação",unavailable:"Indisponível",active:"Ativo",draft:"Rascunho",in_progress:"Em andamento",review:"Em revisão",completed:"Concluída",ended:"Encerrado",open:"Em aberto",partial:"Parcial",paid:"Pago",overdue:"Atrasado",waived:"Dispensado",pending:"Pendente",issued:"Emitida",cancelled:"Cancelada"}[s??""]||s||"—");
const keyType=(s:string)=>({key:"Chave",remote:"Controle",card:"Cartão",tag:"Tag",other:"Outro"}[s]||s);

export default function PropertyDetailPage(){
 const {id}=useParams() as {id:string}; const supabase=createClient();
 const [tab,setTab]=useState<Tab>("overview"); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
 const [property,setProperty]=useState<PropertyRow|null>(null); const [units,setUnits]=useState<UnitRow[]>([]); const [leases,setLeases]=useState<LeaseRow[]>([]);
 const [tenants,setTenants]=useState<TenantRow[]>([]); const [charges,setCharges]=useState<ChargeRow[]>([]); const [invoices,setInvoices]=useState<InvoiceRow[]>([]);
 const [documents,setDocuments]=useState<DocumentRow[]>([]); const [owners,setOwners]=useState<Owner[]>([]); const [ownerships,setOwnerships]=useState<Ownership[]>([]);
 const [expenses,setExpenses]=useState<Expense[]>([]); const [keys,setKeys]=useState<PropertyKey[]>([]); const [inspections,setInspections]=useState<Inspection[]>([]);
 const [ownerToAdd,setOwnerToAdd]=useState(""); const [share,setShare]=useState("100");
 const [keyName,setKeyName]=useState(""); const [keyKind,setKeyKind]=useState("key"); const [keyPosition,setKeyPosition]=useState(""); const [keyCopies,setKeyCopies]=useState("1");

 async function load(){
  setLoading(true);setMessage("");
  const p=await supabase.from("properties").select("*").eq("id",id).single();
  if(p.error||!p.data){setMessage("Não foi possível carregar este imóvel.");setLoading(false);return;}
  setProperty(p.data as PropertyRow);
  const [u,inv,docs,allOwners,rels,exp,k,ins]=await Promise.all([
   supabase.from("units").select("id,name,status,market_rent").eq("property_id",id).order("created_at"),
   supabase.from("invoices").select("id,period,due_date,total,status").eq("property_id",id).order("due_date",{ascending:false}),
   supabase.from("documents").select("id,name,document_type,created_at").eq("property_id",id).order("created_at",{ascending:false}),
   supabase.from("owners").select("id,name,document,email,phone").order("name"),
   supabase.from("property_owners").select("id,owner_id,ownership_percent,is_primary").eq("property_id",id).order("is_primary",{ascending:false}),
   supabase.from("expenses").select("id,description,category,amount,occurred_on").eq("property_id",id).order("occurred_on",{ascending:false}),
   supabase.from("property_keys").select("id,name,key_type,board_position,copies,notes").eq("property_id",id).order("created_at"),
   supabase.from("inspections").select("id,inspection_type,status,scheduled_at").eq("property_id",id).order("created_at",{ascending:false})
  ]);
  setUnits((u.data??[]) as UnitRow[]); setInvoices((inv.data??[]) as InvoiceRow[]); setDocuments((docs.data??[]) as DocumentRow[]);
  setOwners((allOwners.data??[]) as Owner[]); setOwnerships((rels.data??[]) as Ownership[]); setExpenses((exp.data??[]) as Expense[]); setKeys((k.data??[]) as PropertyKey[]); setInspections((ins.data??[]) as Inspection[]);
  const unitIds=(u.data??[]).map((x:any)=>x.id);
  if(unitIds.length){
   const l=await supabase.from("leases").select("id,unit_id,start_date,end_date,rent_amount,due_day,status,deposit").in("unit_id",unitIds).order("start_date",{ascending:false});
   const leaseRows=(l.data??[]) as LeaseRow[]; setLeases(leaseRows);
   const leaseIds=leaseRows.map(x=>x.id);
   if(leaseIds.length){
    const [links,c]=await Promise.all([
     supabase.from("lease_tenants").select("tenant_id").in("lease_id",leaseIds),
     supabase.from("rent_charges").select("id,lease_id,period,due_date,amount,amount_paid,status").in("lease_id",leaseIds).order("due_date",{ascending:false})
    ]);
    setCharges((c.data??[]) as ChargeRow[]);
    const tids=Array.from(new Set((links.data??[]).map((x:any)=>x.tenant_id).filter(Boolean)));
    if(tids.length){const t=await supabase.from("tenants").select("id,name,email,phone").in("id",tids);setTenants((t.data??[]) as TenantRow[]);} else setTenants([]);
   } else {setTenants([]);setCharges([]);}
  } else {setLeases([]);setTenants([]);setCharges([]);}
  setLoading(false);
 }
 useEffect(()=>{load()},[id]);

 const activeLease=useMemo(()=>leases.find(x=>x.status==="active")??leases[0]??null,[leases]);
 const openBalance=useMemo(()=>charges.reduce((s,x)=>s+Math.max(Number(x.amount)-Number(x.amount_paid??0),0),0),[charges]);
 const paidTotal=useMemo(()=>charges.reduce((s,x)=>s+Number(x.amount_paid??0),0),[charges]);
 const expenseTotal=useMemo(()=>expenses.reduce((s,x)=>s+Number(x.amount??0),0),[expenses]);

 async function addOwner(){
  if(!ownerToAdd)return; const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
  const {error}=await supabase.from("property_owners").insert({user_id:user.id,property_id:id,owner_id:ownerToAdd,ownership_percent:Number(share.replace(",","."))||0,is_primary:ownerships.length===0});
  if(error)alert(error.message); else {setOwnerToAdd("");setShare("100");await load();}
 }
 async function removeOwner(relId:string){if(!confirm("Remover este proprietário do imóvel?"))return;const {error}=await supabase.from("property_owners").delete().eq("id",relId);if(error)alert(error.message);else await load();}
 async function addKey(){
  if(!keyName.trim())return;const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  const {error}=await supabase.from("property_keys").insert({user_id:user.id,property_id:id,name:keyName.trim(),key_type:keyKind,board_position:keyPosition.trim()||null,copies:Number(keyCopies)||1});
  if(error)alert(error.message);else{setKeyName("");setKeyPosition("");setKeyCopies("1");await load();}
 }
 async function toggleArchive(){
  const archived=!property?.archived_at;
  const {error}=await supabase.from("properties").update({archived_at:archived?new Date().toISOString():null}).eq("id",id);
  if(error)alert(error.message);else await load();
 }

 const tabButton=(key:Tab,label:string)=><button className={`btn ${tab===key?"btn-dark":"btn-outline-secondary"} rounded-pill px-4`} onClick={()=>setTab(key)}>{label}</button>;
 if(loading)return <Wrapper><div className="dashboard-body"><DashboardHeaderTwo title="Imóvel"/><div className="bg-white card-box border-20">Carregando imóvel...</div></div></Wrapper>;
 if(!property)return <Wrapper><div className="dashboard-body"><DashboardHeaderTwo title="Imóvel"/><div className="bg-white card-box border-20">{message||"Imóvel não encontrado."}</div></div></Wrapper>;

 return <Wrapper><div className="dashboard-body"><div className="position-relative">
  <DashboardHeaderTwo title="Detalhes do imóvel"/>
  {property.archived_at&&<div className="alert alert-warning d-flex justify-content-between align-items-center"><span>Este imóvel está arquivado. Os dados e o histórico foram preservados.</span><button className="btn btn-sm btn-dark" onClick={toggleArchive}>Reativar</button></div>}
  <div className="d-flex flex-wrap justify-content-between gap-3 mb-30">
   <div><Link href="/dashboard/properties-list" className="text-muted">← Imóveis</Link><h2 className="main-title mb-1 mt-2">{property.name}</h2><div className="text-muted">{property.address}{property.city?` · ${property.city}`:""}{property.state?`/${property.state}`:""}</div></div>
   <div className="d-flex flex-wrap gap-2"><Link href={`/dashboard/edit-property/${id}`} className="dash-btn-two tran3s">Editar</Link><button className="btn btn-outline-dark rounded-pill px-4" onClick={toggleArchive}>{property.archived_at?"Reativar":"Arquivar"}</button></div>
  </div>

  <div className="row g-3 mb-30">
   <div className="col-md-3"><div className="bg-white card-box border-20 h-100"><small className="text-muted">Status</small><div className="fw-500 fs-20">{statusLabel(property.status)}</div></div></div>
   <div className="col-md-3"><div className="bg-white card-box border-20 h-100"><small className="text-muted">Aluguel atual</small><div className="fw-500 fs-20">{money(activeLease?.rent_amount??property.expected_rent??units[0]?.market_rent)}</div></div></div>
   <div className="col-md-3"><div className="bg-white card-box border-20 h-100"><small className="text-muted">Saldo em aberto</small><div className="fw-500 fs-20">{money(openBalance)}</div></div></div>
   <div className="col-md-3"><div className="bg-white card-box border-20 h-100"><small className="text-muted">Despesas</small><div className="fw-500 fs-20">{money(expenseTotal)}</div></div></div>
  </div>

  <div className="d-flex flex-wrap gap-2 mb-30">
   {tabButton("overview","Dados")}{tabButton("owners","Proprietários")}{tabButton("rental","Locação")}{tabButton("finance","Financeiro")}{tabButton("expenses","Despesas")}{tabButton("documents","Documentos")}{tabButton("field","Vistoria e chaves")}{tabButton("utilities","Serviços")}
  </div>

  {tab==="overview"&&<div className="row g-4">
   <div className="col-lg-7"><div className="bg-white card-box border-20 h-100"><h4 className="dash-title-three">Dados do imóvel</h4><div className="row g-3"><div className="col-sm-6"><span className="text-muted d-block">Tipo</span><strong>{property.type||"—"}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Valor atual</span><strong>{money(property.current_value??property.estimated_value)}</strong></div><div className="col-sm-4"><span className="text-muted d-block">Área</span><strong>{property.area?`${property.area} m²`:"—"}</strong></div><div className="col-sm-4"><span className="text-muted d-block">Quartos</span><strong>{property.bedrooms??"—"}</strong></div><div className="col-sm-4"><span className="text-muted d-block">Banheiros</span><strong>{property.bathrooms??"—"}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Aquisição</span><strong>{date(property.acquisition_date)}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Preço de compra</span><strong>{money(property.purchase_price)}</strong></div></div></div></div>
   <div className="col-lg-5"><div className="bg-white card-box border-20 h-100"><h4 className="dash-title-three">Resumo operacional</h4>{[["Proprietários",ownerships.length],["Unidades",units.length],["Locações",leases.length],["Locatários",tenants.length],["Faturas",invoices.length],["Documentos",documents.length],["Vistorias",inspections.length],["Chaves/dispositivos",keys.length]].map(([l,v])=><div key={String(l)} className="d-flex justify-content-between py-2 border-bottom"><span>{l}</span><strong>{v}</strong></div>)}<div className="d-flex justify-content-between py-2"><span>Total recebido</span><strong>{money(paidTotal)}</strong></div></div></div>
  </div>}

  {tab==="owners"&&<div className="bg-white card-box border-20">
   <div className="d-flex justify-content-between align-items-center mb-20"><h4 className="dash-title-three m0">Proprietários e participação</h4><Link href="/dashboard/owners" className="btn btn-sm btn-outline-dark">Cadastro de proprietários</Link></div>
   <div className="row g-2 mb-25"><div className="col-md-6"><select className="form-select" value={ownerToAdd} onChange={e=>setOwnerToAdd(e.target.value)}><option value="">Selecionar proprietário</option>{owners.filter(o=>!ownerships.some(r=>r.owner_id===o.id)).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div><div className="col-md-3"><input className="form-control" type="number" step="0.01" value={share} onChange={e=>setShare(e.target.value)} placeholder="%"/></div><div className="col-md-3"><button className="btn btn-dark w-100" onClick={addOwner}>Vincular</button></div></div>
   {ownerships.length?ownerships.map(r=>{const o=owners.find(x=>x.id===r.owner_id);return <div key={r.id} className="d-flex justify-content-between align-items-center py-3 border-bottom"><div><strong>{o?.name??"Proprietário"}</strong><span className="text-muted d-block">{o?.document||o?.email||"Sem documento"}</span></div><div className="d-flex align-items-center gap-3"><span>{Number(r.ownership_percent).toLocaleString("pt-BR")}% {r.is_primary?"· principal":""}</span><button className="btn btn-sm btn-outline-danger" onClick={()=>removeOwner(r.id)}>Remover</button></div></div>}):<p className="m0">Nenhum proprietário vinculado.</p>}
  </div>}

  {tab==="rental"&&<div className="row g-4"><div className="col-lg-7"><div className="bg-white card-box border-20 h-100"><div className="d-flex justify-content-between mb-20"><h4 className="dash-title-three m0">Locação</h4><Link href="/dashboard/contracts">Gerenciar locações</Link></div>{activeLease?<div className="row g-3"><div className="col-sm-6"><span className="text-muted d-block">Status</span><strong>{statusLabel(activeLease.status)}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Aluguel</span><strong>{money(activeLease.rent_amount)}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Início</span><strong>{date(activeLease.start_date)}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Fim</span><strong>{date(activeLease.end_date)}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Vencimento</span><strong>{activeLease.due_day?`Dia ${activeLease.due_day}`:"—"}</strong></div><div className="col-sm-6"><span className="text-muted d-block">Caução</span><strong>{money(activeLease.deposit)}</strong></div></div>:<p>Nenhuma locação vinculada.</p>}<div className="mt-20"><Link href="/dashboard/lease-contracts" className="btn btn-outline-dark">Ver contratos/documentos</Link></div></div></div><div className="col-lg-5"><div className="bg-white card-box border-20 h-100"><h4 className="dash-title-three">Inquilinos</h4>{tenants.length?tenants.map(t=><div key={t.id} className="pb-3 mb-3 border-bottom"><strong className="d-block">{t.name}</strong><span className="text-muted d-block">{t.email||"Sem e-mail"}</span><span className="text-muted">{t.phone||"Sem telefone"}</span></div>):<p>Nenhum inquilino vinculado.</p>}</div></div></div>}

  {tab==="finance"&&<div className="bg-white card-box border-20"><div className="d-flex justify-content-between mb-20"><h4 className="dash-title-three m0">Cobranças do imóvel</h4><Link href="/dashboard/invoices" className="dash-btn-two tran3s">Abrir cobranças</Link></div><div className="table-responsive"><table className="table"><thead><tr><th>Competência</th><th>Vencimento</th><th>Total</th><th>Pago</th><th>Status</th></tr></thead><tbody>{charges.length?charges.slice(0,12).map(x=><tr key={x.id}><td>{x.period}</td><td>{date(x.due_date)}</td><td>{money(x.amount)}</td><td>{money(x.amount_paid)}</td><td>{statusLabel(x.status)}</td></tr>):<tr><td colSpan={5} className="text-center py-4">Nenhuma cobrança vinculada.</td></tr>}</tbody></table></div></div>}

  {tab==="expenses"&&<div className="bg-white card-box border-20"><div className="d-flex justify-content-between mb-20"><h4 className="dash-title-three m0">Despesas do imóvel</h4><Link href="/dashboard/expenses" className="btn btn-outline-dark">Gerenciar despesas</Link></div>{expenses.length?expenses.map(e=><div key={e.id} className="d-flex justify-content-between py-3 border-bottom"><div><strong>{e.description}</strong><span className="text-muted d-block">{e.category||"Sem categoria"} · {date(e.occurred_on)}</span></div><strong>{money(e.amount)}</strong></div>):<p className="m0">Nenhuma despesa lançada.</p>}</div>}

  {tab==="documents"&&<div className="bg-white card-box border-20"><div className="d-flex justify-content-between mb-20"><h4 className="dash-title-three m0">Documentos e anexos</h4><Link href={`/dashboard/property-documents/${id}`} className="dash-btn-two tran3s">Gerenciar documentos</Link></div>{documents.length?documents.map(d=><div key={d.id} className="d-flex justify-content-between py-3 border-bottom"><div><strong>{d.name}</strong><span className="text-muted d-block">{d.document_type||"Documento"}</span></div><span>{date(d.created_at)}</span></div>):<p>Nenhum documento armazenado.</p>}</div>}

  {tab==="field"&&<div className="row g-4"><div className="col-lg-7"><div className="bg-white card-box border-20 h-100"><div className="d-flex justify-content-between mb-20"><h4 className="dash-title-three m0">Vistorias</h4><Link href="/dashboard/inspections" className="btn btn-sm btn-outline-dark">Gerenciar</Link></div>{inspections.length?inspections.map(i=><div key={i.id} className="d-flex justify-content-between py-3 border-bottom"><div><strong>{i.inspection_type==="entry"?"Entrada":i.inspection_type==="exit"?"Saída":"Vistoria"}</strong><span className="text-muted d-block">{date(i.scheduled_at)}</span></div><div><span className="me-3">{statusLabel(i.status)}</span><Link href={`/dashboard/inspections/${i.id}`}>Abrir</Link></div></div>):<p>Nenhuma vistoria criada.</p>}</div></div><div className="col-lg-5"><div className="bg-white card-box border-20 h-100"><h4 className="dash-title-three">Chaves e dispositivos</h4><div className="row g-2 mb-20"><div className="col-12"><input className="form-control" placeholder="Nome (ex.: Porta principal)" value={keyName} onChange={e=>setKeyName(e.target.value)}/></div><div className="col-5"><select className="form-select" value={keyKind} onChange={e=>setKeyKind(e.target.value)}><option value="key">Chave</option><option value="remote">Controle</option><option value="card">Cartão</option><option value="tag">Tag</option><option value="other">Outro</option></select></div><div className="col-4"><input className="form-control" placeholder="Posição" value={keyPosition} onChange={e=>setKeyPosition(e.target.value)}/></div><div className="col-3"><input className="form-control" type="number" min="0" value={keyCopies} onChange={e=>setKeyCopies(e.target.value)}/></div><div className="col-12"><button className="btn btn-dark w-100" onClick={addKey}>Adicionar</button></div></div>{keys.length?keys.map(k=><div key={k.id} className="py-2 border-bottom"><strong>{k.name}</strong><span className="text-muted d-block">{keyType(k.key_type)} · {k.copies} cópia(s){k.board_position?` · posição ${k.board_position}`:""}</span></div>):<p>Nenhuma chave cadastrada.</p>}</div></div></div>}

  {tab==="utilities"&&<div className="bg-white card-box border-20"><h4 className="dash-title-three">Água e energia</h4><div className="row g-4"><div className="col-md-6"><span className="text-muted d-block">Água</span><strong>{property.water_provider||"SABESP"}</strong><div>RGI: {property.water_account_number||"Não informado"}</div></div><div className="col-md-6"><span className="text-muted d-block">Energia</span><strong>{property.electricity_provider||"CPFL"}</strong><div>Instalação / UC: {property.electricity_account_number||"Não informado"}</div></div><div className="col-12"><span className="text-muted d-block">Titularidade</span>{property.utility_transfer_notes||"Nenhuma observação cadastrada."}</div></div></div>}
 </div></div></Wrapper>
}
