"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Inspection={id:string;status:string;inspection_type:string;properties:{name:string}|null};
type Item={id:string;name:string;evaluation_status:string;condition:string|null;notes:string|null};
type Room={id:string;name:string;items:Item[]};

const conditionLabel=(v:string)=>({excellent:"Excelente",good:"Bom",fair:"Regular",poor:"Ruim",damaged:"Danificado"}[v]||v);

export default function InspectionDetailPage(){
 const params=useParams(); const id=params.id as string; const supabase=createClient();
 const [inspection,setInspection]=useState<Inspection|null>(null);
 const [rooms,setRooms]=useState<Room[]>([]);
 const [message,setMessage]=useState("");

 async function load(){
   const {data:i,error}=await supabase.from("inspections").select("id,status,inspection_type,properties(name)").eq("id",id).single();
   if(error||!i){setMessage("Vistoria não encontrada.");return;}
   setInspection(i as unknown as Inspection);
   const {data:r,error:re}=await supabase.from("inspection_rooms").select("id,name,sort_order,inspection_items(id,name,evaluation_status,condition,notes,sort_order)").eq("inspection_id",id).order("sort_order");
   if(re){setMessage(re.message);return;}
   setRooms(((r??[]) as any[]).map(x=>({id:x.id,name:x.name,items:(x.inspection_items??[]).sort((a:any,b:any)=>a.sort_order-b.sort_order)})));
 }
 useEffect(()=>{load()},[id]);

 async function updateItem(item:Item, patch:Partial<Item>){
   const next={...item,...patch};
   const {error}=await supabase.from("inspection_items").update({
     evaluation_status:next.evaluation_status,condition:next.condition,notes:next.notes
   }).eq("id",item.id);
   if(error){alert(error.message);return;} await load();
 }

 async function setStatus(status:string){
   const patch:any={status};
   if(status==="in_progress")patch.started_at=new Date().toISOString();
   if(status==="completed")patch.completed_at=new Date().toISOString();
   const {error}=await supabase.from("inspections").update(patch).eq("id",id);
   if(error)alert(error.message); else await load();
 }

 const total=rooms.reduce((s,r)=>s+r.items.length,0);
 const evaluated=rooms.reduce((s,r)=>s+r.items.filter(i=>i.evaluation_status!=="not_evaluated").length,0);

 return <Wrapper><div className="dashboard-body"><div className="position-relative">
  <DashboardHeaderTwo title="Detalhe da vistoria" />
  {message&&<div className="alert alert-light border">{message}</div>}
  {inspection&&<>
   <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center mb-25">
    <div><h2 className="main-title mb-1">{inspection.properties?.name??"Vistoria"}</h2><p className="m0">{evaluated}/{total} itens avaliados</p></div>
    <div className="d-flex gap-2">
      {inspection.status==="draft"&&<button className="btn btn-dark rounded-pill px-4" onClick={()=>setStatus("in_progress")}>Iniciar vistoria</button>}
      {inspection.status==="in_progress"&&<button className="btn btn-outline-dark rounded-pill px-4" onClick={()=>setStatus("review")}>Enviar para revisão</button>}
      {inspection.status==="review"&&<button className="btn btn-dark rounded-pill px-4" onClick={()=>setStatus("completed")}>Concluir vistoria</button>}
    </div>
   </div>

   {rooms.map(room=><div key={room.id} className="bg-white card-box border-20 mb-25">
    <h4 className="dash-title-three">{room.name}</h4>
    <div className="table-responsive"><table className="table"><thead><tr><th>Item</th><th>Estado da avaliação</th><th>Condição</th><th>Observação</th></tr></thead><tbody>
     {room.items.map(item=><tr key={item.id}>
      <td><strong>{item.name}</strong></td>
      <td><select className="form-select" value={item.evaluation_status} onChange={e=>updateItem(item,{evaluation_status:e.target.value,condition:e.target.value==="evaluated"?(item.condition??"good"):null})}><option value="not_evaluated">Não avaliado</option><option value="not_applicable">N/A</option><option value="evaluated">Avaliado</option></select></td>
      <td>{item.evaluation_status==="evaluated"?<select className="form-select" value={item.condition??"good"} onChange={e=>updateItem(item,{condition:e.target.value})}><option value="excellent">Excelente</option><option value="good">Bom</option><option value="fair">Regular</option><option value="poor">Ruim</option><option value="damaged">Danificado</option></select>:<span className="text-muted">—</span>}</td>
      <td><input className="form-control" defaultValue={item.notes??""} placeholder="Observação" onBlur={e=>{if(e.target.value!==(item.notes??""))updateItem(item,{notes:e.target.value||null})}}/></td>
     </tr>)}
    </tbody></table></div>
   </div>)}
  </>}
 </div></div></Wrapper>
}
