"use client"

import { FormEvent, useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Account={id:string;display_phone_number:string|null;verified_name:string|null;invoice_template_name:string|null;invoice_template_language:string|null};
type Tenant={id:string;name:string;phone:string|null};
type Conversation={
 id:string;tenant_id:string|null;contact_phone:string;contact_name:string|null;last_message_at:string|null;
 last_inbound_at:string|null;last_outbound_at:string|null;unread_count:number;status:string;
 tenants:{name:string;phone:string|null}|null
};
type Message={id:string;direction:string;message_type:string;body:string|null;status:string|null;created_at:string;sent_at:string|null;delivered_at:string|null;read_at:string|null;failed_at:string|null;error_message:string|null};
type Template={id:string;name:string;language:string;category:string|null;status:string|null;body_preview:string|null};

const normalize=(v:string)=>String(v||"").replace(/\D/g,"");
const fmt=(v:string|null)=>v?new Date(v).toLocaleString("pt-BR"):"";
const windowOpen=(v:string|null)=>Boolean(v&&Date.now()-new Date(v).getTime()<=24*60*60*1000);

export default function WhatsAppPage(){
 const supabase=createClient();
 const [account,setAccount]=useState<Account|null>(null);
 const [tenants,setTenants]=useState<Tenant[]>([]);
 const [conversations,setConversations]=useState<Conversation[]>([]);
 const [selectedId,setSelectedId]=useState<string>("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [templates,setTemplates]=useState<Template[]>([]);
 const [newTenantId,setNewTenantId]=useState("");
 const [draft,setDraft]=useState("");
 const [templateId,setTemplateId]=useState("");
 const [invoiceTemplateId,setInvoiceTemplateId]=useState("");
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [message,setMessage]=useState("");

 const selected=conversations.find(c=>c.id===selectedId)??null;
 const canFreeText=windowOpen(selected?.last_inbound_at??null);

 async function loadBase(){
  setLoading(true);
  const [a,t,c,tp]=await Promise.all([
   supabase.from("whatsapp_accounts").select("id,display_phone_number,verified_name,invoice_template_name,invoice_template_language").limit(1).maybeSingle(),
   supabase.from("tenants").select("id,name,phone").order("name"),
   supabase.from("whatsapp_conversations").select("id,tenant_id,contact_phone,contact_name,last_message_at,last_inbound_at,last_outbound_at,unread_count,status,tenants(name,phone)").eq("status","open").order("last_message_at",{ascending:false,nullsFirst:false}),
   supabase.from("whatsapp_templates").select("id,name,language,category,status,body_preview").order("name")
  ]);
  if(a.error||t.error||c.error||tp.error)setMessage(a.error?.message||t.error?.message||c.error?.message||tp.error?.message||"Erro ao carregar WhatsApp.");
  const accountData=a.data as Account|null;
  setAccount(accountData);setTenants((t.data??[]) as Tenant[]);setConversations((c.data as unknown as Conversation[])??[]);setTemplates((tp.data??[]) as Template[]);
  if(accountData?.invoice_template_name){
    const match=(tp.data??[]).find((x:any)=>x.name===accountData.invoice_template_name&&x.language===(accountData.invoice_template_language||"pt_BR"));
    if(match)setInvoiceTemplateId(match.id);
  }
  if(!selectedId&&(c.data?.length??0)>0)setSelectedId((c.data as any[])[0].id);
  setLoading(false);
 }

 async function loadMessages(id:string){
  if(!id){setMessages([]);return;}
  const {data,error}=await supabase.from("whatsapp_messages").select("id,direction,message_type,body,status,created_at,sent_at,delivered_at,read_at,failed_at,error_message").eq("conversation_id",id).order("created_at",{ascending:true});
  if(error){setMessage(error.message);return;}
  setMessages((data??[]) as Message[]);
  await supabase.from("whatsapp_conversations").update({unread_count:0}).eq("id",id);
 }

 useEffect(()=>{loadBase()},[]);
 useEffect(()=>{if(selectedId)loadMessages(selectedId)},[selectedId]);
 useEffect(()=>{
  const timer=setInterval(async()=>{
   await loadBase();
   if(selectedId)await loadMessages(selectedId);
  },7000);
  return()=>clearInterval(timer);
 },[selectedId]);

 async function startConversation(){
  if(!account||!newTenantId)return;
  const tenant=tenants.find(t=>t.id===newTenantId); if(!tenant?.phone){setMessage("O inquilino selecionado não possui telefone cadastrado.");return;}
  const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
  const phone=normalize(tenant.phone);
  const {data,error}=await supabase.from("whatsapp_conversations").upsert({
   user_id:user.id,whatsapp_account_id:account.id,tenant_id:tenant.id,contact_phone:phone,contact_name:tenant.name,status:"open",updated_at:new Date().toISOString()
  },{onConflict:"whatsapp_account_id,contact_phone"}).select("id").single();
  if(error||!data){setMessage("Erro ao abrir conversa: "+(error?.message??""));return;}
  setNewTenantId("");setSelectedId(data.id);await loadBase();await loadMessages(data.id);
 }

 async function sendText(e:FormEvent){
  e.preventDefault(); if(!selected||!draft.trim())return;
  setSending(true);setMessage("");
  const {data,error}=await supabase.functions.invoke("whatsapp-send-message",{body:{conversation_id:selected.id,kind:"text",text:draft.trim()}});
  setSending(false);
  if(error||data?.error){setMessage(data?.error||"Não foi possível enviar a mensagem.");return;}
  setDraft("");await loadMessages(selected.id);await loadBase();
 }

 async function sendTemplate(){
  if(!selected||!templateId)return;
  const tp=templates.find(t=>t.id===templateId); if(!tp)return;
  setSending(true);setMessage("");
  const {data,error}=await supabase.functions.invoke("whatsapp-send-message",{body:{
    conversation_id:selected.id,kind:"template",template_name:tp.name,template_language:tp.language,preview_text:tp.body_preview||`Template: ${tp.name}`
  }});
  setSending(false);
  if(error||data?.error){setMessage(data?.error||"Não foi possível enviar o template.");return;}
  await loadMessages(selected.id);await loadBase();
 }

 async function saveInvoiceTemplate(){
  if(!account)return;
  const tp=templates.find(t=>t.id===invoiceTemplateId);
  const {error}=await supabase.from("whatsapp_accounts").update({
    invoice_template_name:tp?.name||null,
    invoice_template_language:tp?.language||"pt_BR",
    updated_at:new Date().toISOString()
  }).eq("id",account.id);
  if(error)setMessage("Erro ao salvar template de fatura: "+error.message);
  else {setMessage(tp?"Template de fatura mensal salvo.":"Template de fatura removido.");await loadBase();}
 }

 async function syncTemplates(){
  setMessage("Sincronizando templates...");
  const {data,error}=await supabase.functions.invoke("whatsapp-sync-templates",{body:{}});
  if(error||data?.error){setMessage(data?.error||"Falha ao sincronizar templates.");return;}
  setMessage(`${data.count??0} template(s) sincronizado(s) com a Meta.`);await loadBase();
 }

 const conversationTitle=(c:Conversation)=>c.tenants?.name||c.contact_name||c.contact_phone;
 const statusText=(m:Message)=>{
  if(m.failed_at||m.status==="failed")return "Falhou";
  if(m.read_at||m.status==="read")return "Lida";
  if(m.delivered_at||m.status==="delivered")return "Entregue";
  if(m.sent_at||m.status==="sent")return "Enviada";
  if(m.direction==="inbound")return "Recebida";
  return "Aceita";
 };

 return <Wrapper><div className="dashboard-body"><div className="position-relative">
  <DashboardHeaderTwo title="WhatsApp"/>
  <div className="d-flex flex-wrap justify-content-between gap-3 align-items-end mb-25">
   <div><h2 className="main-title mb-1">Central de WhatsApp</h2><p className="m0">Converse com inquilinos, acompanhe entrega/leitura e envie templates oficiais.</p></div>
   <div className="text-end"><div className="fw-500">{account?.verified_name||"Conta WhatsApp"}</div><small className="text-muted">{account?.display_phone_number||"Número conectado"}</small></div>
  </div>

  {!account&&!loading&&<div className="alert alert-warning">A conta WhatsApp ainda não está vinculada ao seu usuário.</div>}
  {message&&<div className="alert alert-light border">{message}</div>}

  <div className="bg-white card-box border-20 mb-25">
   <div className="row g-3 align-items-end">
    <div className="col-lg-6"><label className="d-block mb-1">Abrir conversa com inquilino</label><div className="d-flex gap-2"><select className="form-select" value={newTenantId} onChange={e=>setNewTenantId(e.target.value)}><option value="">Selecione</option>{tenants.map(t=><option key={t.id} value={t.id} disabled={!t.phone}>{t.name}{t.phone?` · ${t.phone}`:" · sem telefone"}</option>)}</select><button className="btn btn-dark" disabled={!account||!newTenantId} onClick={startConversation}>Abrir</button></div></div>
    <div className="col-lg-6"><label className="d-block mb-1">Template aprovado para fatura mensal</label><div className="d-flex gap-2"><select className="form-select" value={invoiceTemplateId} onChange={e=>setInvoiceTemplateId(e.target.value)}><option value="">Não configurado</option>{templates.filter(t=>!t.status||t.status==="APPROVED").map(t=><option key={t.id} value={t.id}>{t.name} · {t.language}</option>)}</select><button className="btn btn-outline-dark" disabled={!account} onClick={saveInvoiceTemplate}>Salvar</button></div></div>
    <div className="col-12"><button className="btn btn-sm btn-link p-0 text-decoration-none" disabled={!account} onClick={syncTemplates}>Sincronizar templates com a Meta</button></div>
   </div>
  </div>

  <div className="row g-4">
   <div className="col-lg-4"><div className="bg-white card-box border-20" style={{minHeight:620}}>
    <h4 className="dash-title-three mb-20">Conversas</h4>
    {loading?<p>Carregando...</p>:conversations.length?conversations.map(c=><button key={c.id} onClick={()=>setSelectedId(c.id)} className={`w-100 text-start border-0 border-bottom p-3 ${selectedId===c.id?"bg-light":""}`} style={{background:"transparent"}}>
     <div className="d-flex justify-content-between gap-2"><strong>{conversationTitle(c)}</strong>{c.unread_count>0&&<span className="badge bg-dark rounded-pill">{c.unread_count}</span>}</div>
     <small className="text-muted d-block">{c.contact_phone}</small><small className="text-muted">{c.last_message_at?fmt(c.last_message_at):"Sem mensagens"}</small>
    </button>):<p className="text-muted">Nenhuma conversa ainda.</p>}
   </div></div>

   <div className="col-lg-8"><div className="bg-white card-box border-20 d-flex flex-column" style={{minHeight:620}}>
    {!selected?<div className="m-auto text-center text-muted">Selecione ou abra uma conversa.</div>:<>
     <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
      <div><h4 className="dash-title-three mb-1">{conversationTitle(selected)}</h4><small className="text-muted">{selected.contact_phone}</small></div>
      <span className={`badge rounded-pill ${canFreeText?"bg-success":"bg-secondary"}`}>{canFreeText?"Janela de 24h aberta":"Template necessário"}</span>
     </div>

     <div style={{flex:1,maxHeight:410,overflowY:"auto"}} className="pe-2">
      {messages.length?messages.map(m=><div key={m.id} className={`d-flex mb-3 ${m.direction==="outbound"?"justify-content-end":"justify-content-start"}`}>
       <div className="border rounded-3 p-3" style={{maxWidth:"78%",background:m.direction==="outbound"?"#f3f7f4":"#fff"}}>
        <div style={{whiteSpace:"pre-wrap"}}>{m.body||`[${m.message_type}]`}</div>
        <div className="d-flex gap-2 justify-content-end mt-2"><small className="text-muted">{fmt(m.created_at)}</small><small className="text-muted">{statusText(m)}</small></div>
        {m.error_message&&<small className="text-danger d-block mt-1">{m.error_message}</small>}
       </div>
      </div>):<p className="text-muted text-center mt-5">Ainda não há mensagens nesta conversa.</p>}
     </div>

     <div className="border-top pt-3 mt-3">
      {canFreeText?<form onSubmit={sendText}><div className="d-flex gap-2"><textarea className="form-control" rows={2} placeholder="Digite uma mensagem..." value={draft} onChange={e=>setDraft(e.target.value)}/><button className="btn btn-dark px-4" disabled={sending||!draft.trim()}>{sending?"Enviando...":"Enviar"}</button></div></form>:<div>
       <div className="alert alert-light border py-2">Como o inquilino não enviou mensagem nas últimas 24 horas, a Meta exige um template aprovado para iniciar/reabrir a conversa.</div>
       <div className="d-flex gap-2"><select className="form-select" value={templateId} onChange={e=>setTemplateId(e.target.value)}><option value="">Selecione um template aprovado</option>{templates.filter(t=>!t.status||t.status==="APPROVED").map(t=><option key={t.id} value={t.id}>{t.name} · {t.language}</option>)}</select><button className="btn btn-dark" disabled={sending||!templateId} onClick={sendTemplate}>{sending?"Enviando...":"Enviar template"}</button></div>
      </div>}
     </div>
    </>}
   </div></div>
  </div>
 </div></div></Wrapper>
}