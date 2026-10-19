"use client"

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Property={id:string;name:string};
type Inspection={id:string;property_id:string;inspection_type:string;status:string;scheduled_at:string|null;created_at:string;properties:{name:string}|null};

const typeLabel=(v:string)=>({entry:"Entrada",exit:"Saída",periodic:"Periódica",other:"Outra"}[v]||v);
const statusLabel=(v:string)=>({draft:"Rascunho",in_progress:"Em andamento",review:"Em revisão",completed:"Concluída",cancelled:"Cancelada"}[v]||v);

const defaults=[
 ["Sala de estar",["Piso","Paredes","Teto","Portas","Janelas","Tomadas","Interruptores","Iluminação","Rodapés","Limpeza"]],
 ["Cozinha",["Piso","Paredes","Teto","Portas","Janelas","Pia","Torneira","Armários","Tomadas","Iluminação"]],
 ["Quarto",["Piso","Paredes","Teto","Portas","Janelas","Tomadas","Interruptores","Iluminação","Rodapés"]],
 ["Banheiro",["Piso","Paredes","Teto","Porta","Janela","Vaso sanitário","Pia","Torneira","Chuveiro"]]
];

export default function InspectionsPage(){
 const supabase=createClient();
 const [properties,setProperties]=useState<Property[]>([]);
 const [items,setItems]=useState<Inspection[]>([]);
 const [propertyId,setPropertyId]=useState("");
 const [inspectionType,setInspectionType]=useState("entry");
 const [scheduledAt,setScheduledAt]=useState("");
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);

 async function load(){
   const [p,i]=await Promise.all([
     supabase.from("properties").select("id,name").is("archived_at",null).order("name"),
     supabase.from("inspections").select("id,property_id,inspection_type,status,scheduled_at,created_at,properties(name)").order("created_at",{ascending:false})
   ]);
   if(p.error||i.error)setMessage(p.error?.message||i.error?.message||"Erro ao carregar.");
   setProperties((p.data as Property[])??[]);setItems((i.data as unknown as Inspection[])??[]);
 }
 useEffect(()=>{load()},[]);

 async function createInspection(e:FormEvent){
   e.preventDefault();setSaving(true);setMessage("");
   const {data:{user}}=await supabase.auth.getUser();if(!user){setSaving(false);return;}
   const {data:inspection,error}=await supabase.from("inspections").insert({
     user_id:user.id,property_id:propertyId,inspection_type:inspectionType,status:"draft",scheduled_at:scheduledAt||null
   }).select("id").single();
   if(error||!inspection){setSaving(false);setMessage("Erro ao criar vistoria: "+(error?.message??""));return;}
   for(let r=0;r<defaults.length;r++){
     const [roomName,roomItems]=defaults[r] as [string,string[]];
     const {data:room,error:roomError}=await supabase.from("inspection_rooms").insert({
       user_id:user.id,inspection_id:inspection.id,name:roomName,sort_order:r
     }).select("id").single();
     if(roomError||!room)continue;
     await supabase.from("inspection_items").insert(roomItems.map((name,idx)=>({
       user_id:user.id,room_id:room.id,name,sort_order:idx,evaluation_status:"not_evaluated"
     })));
   }
   setSaving(false);setPropertyId("");setScheduledAt("");await load();
 }

 async function start(i:Inspection){
   const {error}=await supabase.from("inspections").update({status:"in_progress",started_at:new Date().toISOString()}).eq("id",i.id);
   if(error)alert(error.message);else await load();
 }

 return <Wrapper><div className="dashboard-body"><div className="position-relative">
  <DashboardHeaderTwo title="Vistorias" />
  <h2 className="main-title mb-1">Vistorias</h2>
  <p className="mb-25">Estrutura por cômodo e item. “Não avaliado” é diferente de “N/A”, e iniciar a vistoria exige uma ação explícita.</p>

  <form onSubmit={createInspection}><div className="bg-white card-box border-20 mb-30"><h4 className="dash-title-three">Nova vistoria</h4><div className="row">
   <div className="col-md-5"><div className="dash-input-wrapper mb-25"><label>Imóvel*</label><select className="nice-select" required value={propertyId} onChange={e=>setPropertyId(e.target.value)}><option value="">Selecione</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
   <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Tipo</label><select className="nice-select" value={inspectionType} onChange={e=>setInspectionType(e.target.value)}><option value="entry">Entrada</option><option value="exit">Saída</option><option value="periodic">Periódica</option><option value="other">Outra</option></select></div></div>
   <div className="col-md-3"><div className="dash-input-wrapper mb-25"><label>Data prevista</label><input type="date" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></div></div>
  </div>
  {message&&<p>{message}</p>}
  <button className="dash-btn-two tran3s" disabled={saving||!propertyId}>{saving?"Criando...":"Criar vistoria em rascunho"}</button>
  </div></form>

  <div className="bg-white card-box border-20"><div className="table-responsive"><table className="table"><thead><tr><th>Imóvel</th><th>Tipo</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
   {items.length?items.map(i=><tr key={i.id}><td><strong>{i.properties?.name??"—"}</strong></td><td>{typeLabel(i.inspection_type)}</td><td>{i.scheduled_at?new Date(i.scheduled_at+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td><td>{statusLabel(i.status)}</td><td>{i.status==="draft"&&<button className="btn btn-sm btn-outline-dark me-2" onClick={()=>start(i)}>Iniciar</button>}<Link className="btn btn-sm btn-outline-secondary" href={`/dashboard/inspections/${i.id}`}>Abrir</Link></td></tr>):<tr><td colSpan={5} className="text-center py-5">Nenhuma vistoria criada.</td></tr>}
  </tbody></table></div></div>
 </div></div></Wrapper>
}
