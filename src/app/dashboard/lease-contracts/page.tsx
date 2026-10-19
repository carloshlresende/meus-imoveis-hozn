"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Lease = {
  id:string;
  start_date:string|null;
  end_date:string|null;
  status:string|null;
  units:{name:string;properties:{name:string}|null}|null;
  tenants:{name:string}|null;
};

type Contract = {
  id:string;
  lease_id:string;
  phase:string;
  version:number;
  created_at:string;
  updated_at:string;
  document_id:string|null;
  leases:Lease|null;
};

const phaseLabel=(p:string)=>({
  draft:"Minuta",
  review:"Em revisão",
  signature:"Em assinatura",
  signed:"Gerado / assinado",
  cancelled:"Cancelado"
}[p]||p);

export default function LeaseContractsPage(){
  const supabase=createClient();
  const [contracts,setContracts]=useState<Contract[]>([]);
  const [leases,setLeases]=useState<Lease[]>([]);
  const [filter,setFilter]=useState("all");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  async function load(){
    setLoading(true);
    const [contractsResult, leasesResult]=await Promise.all([
      supabase
        .from("rental_contracts")
        .select("id,lease_id,phase,version,created_at,updated_at,document_id,leases!rental_contracts_lease_id_fkey(id,start_date,end_date,status,units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name)),tenants!leases_tenant_id_fkey(name))")
        .order("updated_at",{ascending:false}),
      supabase
        .from("leases")
        .select("id,start_date,end_date,status,units!leases_unit_id_fkey(name,properties!units_property_id_fkey(name)),tenants!leases_tenant_id_fkey(name)")
        .order("created_at",{ascending:false})
    ]);
    if(contractsResult.error||leasesResult.error) setMessage(contractsResult.error?.message||leasesResult.error?.message||"Erro ao carregar.");
    setContracts((contractsResult.data as unknown as Contract[])??[]);
    setLeases((leasesResult.data as unknown as Lease[])??[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>filter==="all"?contracts:contracts.filter(c=>c.phase===filter),[contracts,filter]);
  const withContract=new Set(contracts.map(c=>c.lease_id));
  const without=leases.filter(l=>!withContract.has(l.id));

  return <Wrapper><div className="dashboard-body"><div className="position-relative">
    <DashboardHeaderTwo title="Contratos" />
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-25">
      <div>
        <h2 className="main-title mb-1">Contratos</h2>
        <p className="m0">Documentos contratuais separados da locação, com versão e fase próprias.</p>
      </div>
      <Link href="/dashboard/contract-templates" className="dash-btn-two tran3s">Modelos</Link>
    </div>

    <div className="d-flex flex-wrap gap-2 mb-25">
      {[
        ["all","Todos"],["draft","Minutas"],["review","Em revisão"],["signature","Em assinatura"],["signed","Gerados / assinados"]
      ].map(([value,label])=><button key={value} className={`btn ${filter===value?"btn-dark":"btn-outline-secondary"} rounded-pill px-4`} onClick={()=>setFilter(value)}>{label}</button>)}
    </div>

    {without.length>0&&<div className="bg-white card-box border-20 mb-30">
      <h4 className="dash-title-three mb-20">Locações sem documento contratual</h4>
      <p className="mb-20">A locação existe independentemente do contrato. Gere uma minuta apenas quando quiser criar o documento.</p>
      <div className="row g-3">
        {without.map(l=><div className="col-lg-6" key={l.id}><div className="border rounded-3 p-3 h-100">
          <strong className="d-block">{l.units?.properties?.name??"Imóvel"} · {l.units?.name??"Unidade"}</strong>
          <span className="text-muted d-block mb-2">{l.tenants?.name??"Sem locatário"}</span>
          <Link href={`/dashboard/contracts/${l.id}/generate`} className="btn btn-sm btn-outline-dark">Criar minuta / gerar PDF</Link>
        </div></div>)}
      </div>
    </div>}

    <div className="bg-white card-box border-20">
      {message&&<div className="alert alert-light border">{message}</div>}
      <div className="table-responsive">
        <table className="table"><thead><tr><th>Imóvel / unidade</th><th>Locatário</th><th>Fase</th><th>Versão</th><th>Atualizado</th><th>Ações</th></tr></thead>
        <tbody>{loading?<tr><td colSpan={6} className="text-center py-5">Carregando...</td></tr>:filtered.length?filtered.map(c=><tr key={c.id}>
          <td><strong>{c.leases?.units?.properties?.name??"—"}</strong><br/><small>{c.leases?.units?.name??"—"}</small></td>
          <td>{c.leases?.tenants?.name??"—"}</td>
          <td>{phaseLabel(c.phase)}</td>
          <td>v{c.version}</td>
          <td>{new Date(c.updated_at).toLocaleDateString("pt-BR")}</td>
          <td><Link href={`/dashboard/contracts/${c.lease_id}/generate`} className="btn btn-sm btn-outline-dark">Abrir documento</Link></td>
        </tr>):<tr><td colSpan={6} className="text-center py-5">Nenhum documento contratual criado.</td></tr>}</tbody></table>
      </div>
    </div>
  </div></div></Wrapper>;
}
