"use client"

import { FormEvent, useEffect, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Template = {
  id: string;
  name: string;
  description: string | null;
  template_text: string;
  is_active: boolean;
};

const starterTemplate = `CONTRATO DE LOCAÇÃO

LOCADOR: {{locador_nome}}
LOCATÁRIO: {{locatario_nome}}
CPF: {{locatario_documento}}

IMÓVEL: {{imovel_endereco}}
RGI SABESP: {{rgi_sabesp}}
INSTALAÇÃO/UC CPFL: {{uc_cpfl}}

VALOR DO ALUGUEL: {{valor_aluguel}}
VENCIMENTO: dia {{dia_vencimento}}
INÍCIO: {{inicio_contrato}}
TÉRMINO: {{fim_contrato}}
REAJUSTE: {{indice_reajuste}}

O LOCATÁRIO obriga-se a transferir para sua titularidade as contas de água e energia elétrica referentes ao imóvel locado.

Demais cláusulas do contrato...
`;

export default function ContractTemplatesPage() {
  const supabase=createClient();
  const [templates,setTemplates]=useState<Template[]>([]);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [templateText,setTemplateText]=useState(starterTemplate);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  async function load(){
    const {data,error}=await supabase.from("contract_templates").select("*").order("created_at",{ascending:false});
    if(error)setMessage(error.message); else setTemplates((data as Template[])??[]);
  }

  useEffect(()=>{load()},[]);

  function reset(){
    setName("");setDescription("");setTemplateText(starterTemplate);setEditingId(null);setMessage("");
  }

  function edit(t:Template){
    setEditingId(t.id);setName(t.name);setDescription(t.description??"");setTemplateText(t.template_text);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function save(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setMessage("Você precisa estar logado.");return}

    const payload={user_id:user.id,name:name.trim(),description:description.trim()||null,template_text:templateText,is_active:true,updated_at:new Date().toISOString()};
    const result=editingId
      ? await supabase.from("contract_templates").update(payload).eq("id",editingId)
      : await supabase.from("contract_templates").insert(payload);

    if(result.error){setMessage("Erro: "+result.error.message);return}
    reset();await load();
  }

  async function remove(t:Template){
    if(!window.confirm(`Excluir o modelo "${t.name}"?`))return;
    const {error}=await supabase.from("contract_templates").delete().eq("id",t.id);
    if(error)alert(error.message); else load();
  }

  return <Wrapper><div className="dashboard-body"><div className="position-relative">
    <DashboardHeaderTwo title="Modelos de contrato"/>
    <h2 className="main-title d-block d-lg-none">Modelos de contrato</h2>

    <form onSubmit={save}><div className="bg-white card-box border-20 mb-40">
      <h4 className="dash-title-three">{editingId?"Editar modelo":"Novo modelo"}</h4>
      <div className="row">
        <div className="col-md-6"><div className="dash-input-wrapper mb-30"><label>Nome do modelo*</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Contrato residencial padrão" required/></div></div>
        <div className="col-md-6"><div className="dash-input-wrapper mb-30"><label>Descrição</label><input value={description} onChange={e=>setDescription(e.target.value)} /></div></div>
        <div className="col-12"><div className="dash-input-wrapper mb-20"><label>Texto do contrato*</label><textarea style={{minHeight:420}} value={templateText} onChange={e=>setTemplateText(e.target.value)} required/></div></div>
      </div>

      <div className="alert alert-light border">
        Campos automáticos disponíveis: <code>{"{{locador_nome}}"}</code>, <code>{"{{locatario_nome}}"}</code>, <code>{"{{locatario_documento}}"}</code>, <code>{"{{imovel_endereco}}"}</code>, <code>{"{{rgi_sabesp}}"}</code>, <code>{"{{uc_cpfl}}"}</code>, <code>{"{{valor_aluguel}}"}</code>, <code>{"{{dia_vencimento}}"}</code>, <code>{"{{inicio_contrato}}"}</code>, <code>{"{{fim_contrato}}"}</code> e <code>{"{{indice_reajuste}}"}</code>.
      </div>

      <button className="dash-btn-two tran3s me-3">{editingId?"Salvar alterações":"Salvar modelo"}</button>
      {editingId&&<button type="button" className="dash-cancel-btn tran3s" onClick={reset}>Cancelar</button>}
      {message&&<p className="mt-20">{message}</p>}
    </div></form>

    <div className="bg-white card-box border-20"><div className="table-responsive"><table className="table property-list-table">
      <thead><tr><th>Modelo</th><th>Descrição</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody className="border-0">
      {templates.length===0?<tr><td colSpan={4} className="text-center py-5">Nenhum modelo cadastrado.</td></tr>:
      templates.map(t=><tr key={t.id}><td><strong>{t.name}</strong></td><td>{t.description||"—"}</td><td>{t.is_active?"Ativo":"Inativo"}</td><td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-dark" onClick={()=>edit(t)}>Editar</button><button className="btn btn-sm btn-outline-danger" onClick={()=>remove(t)}>Excluir</button></div></td></tr>)}
      </tbody>
    </table></div></div>
  </div></div></Wrapper>
}
