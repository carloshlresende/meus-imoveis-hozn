"use client"

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Invoice = {
  id: string;
  lease_id: string;
  tenant_id: string | null;
  property_id: string | null;
  period: string;
  due_date: string;
  subtotal: number;
  adjustments: number;
  total: number;
  description: string | null;
  status: string;
  payment_mode: string;
  manual_pix_key: string | null;
  manual_payment_instructions: string | null;
  asaas_payment_id: string | null;
  asaas_invoice_url: string | null;
  asaas_bank_slip_url: string | null;
  invoice_document_id: string | null;
};

type Tenant = { name:string; document:string|null; email:string|null; phone:string|null };
type Property = { name:string; address:string; city:string|null; state:string|null };
type Landlord = {
  display_name:string;
  document:string|null;
  email:string|null;
  phone:string|null;
  address:string|null;
  city:string|null;
  state:string|null;
};

const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const brDate=(v:string)=>new Date(v+"T12:00:00").toLocaleDateString("pt-BR");

export default function InvoiceDetailPage(){
  const params=useParams();
  const router=useRouter();
  const invoiceId=params.id as string;
  const supabase=createClient();

  const [invoice,setInvoice]=useState<Invoice|null>(null);
  const [tenant,setTenant]=useState<Tenant|null>(null);
  const [property,setProperty]=useState<Property|null>(null);
  const [landlord,setLandlord]=useState<Landlord|null>(null);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.push("/login");return;}

    const {data:inv,error}=await supabase.from("invoices").select("*").eq("id",invoiceId).single();
    if(error||!inv){setMessage("Fatura não encontrada.");setLoading(false);return;}
    setInvoice(inv as Invoice);

    const [tenantResult,propertyResult,landlordResult]=await Promise.all([
      inv.tenant_id
        ? supabase.from("tenants").select("name,document,email,phone").eq("id",inv.tenant_id).single()
        : Promise.resolve({data:null,error:null} as any),
      inv.property_id
        ? supabase.from("properties").select("name,address,city,state").eq("id",inv.property_id).single()
        : Promise.resolve({data:null,error:null} as any),
      supabase.from("landlord_profiles").select("display_name,document,email,phone,address,city,state").eq("user_id",user.id).maybeSingle(),
    ]);

    setTenant((tenantResult.data as Tenant|null)??null);
    setProperty((propertyResult.data as Property|null)??null);
    setLandlord((landlordResult.data as Landlord|null)??null);
    setLoading(false);
  }

  useEffect(()=>{load()},[invoiceId]);

  const reference=useMemo(()=>{
    if(!invoice)return "";
    const [y,m]=invoice.period.split("-");
    return `${m}/${y}`;
  },[invoice]);

  const landlordAddress=useMemo(()=>landlord
    ? [landlord.address,landlord.city,landlord.state].filter(Boolean).join(", ")
    : "",[landlord]);

  const propertyAddress=useMemo(()=>property
    ? [property.address,property.city,property.state].filter(Boolean).join(", ")
    : "",[property]);

  function buildPdf(){
    if(!invoice)return null;
    const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const left=18;
    let y=20;

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(18);
    pdf.text(landlord?.display_name||"IMOBILIÁRIA",left,y);
    y+=7;

    pdf.setFont("helvetica","normal");
    pdf.setFontSize(9);
    if(landlord?.document) pdf.text(`CPF/CNPJ: ${landlord.document}`,left,y), y+=5;
    if(landlordAddress) pdf.text(landlordAddress,left,y), y+=5;
    if(landlord?.email||landlord?.phone) pdf.text([landlord.email,landlord.phone].filter(Boolean).join(" · "),left,y), y+=8;

    pdf.setDrawColor(180);
    pdf.line(left,y,192,y);
    y+=10;

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(16);
    pdf.text("FATURA DE LOCAÇÃO",left,y);
    pdf.setFontSize(10);
    pdf.text(`Ref. ${reference}`,192,y,{align:"right"});
    y+=10;

    pdf.setFont("helvetica","normal");
    pdf.setFontSize(10);
    pdf.text(`Inquilino: ${tenant?.name||"—"}`,left,y); y+=6;
    if(tenant?.document){pdf.text(`CPF/CNPJ: ${tenant.document}`,left,y); y+=6;}
    pdf.text(`Imóvel: ${property?.name||"—"}`,left,y); y+=6;
    pdf.text(`Endereço: ${propertyAddress||"—"}`,left,y); y+=10;

    pdf.setFont("helvetica","bold");
    pdf.text("Descrição",left,y);
    pdf.text("Valor",192,y,{align:"right"});
    y+=5;
    pdf.setFont("helvetica","normal");
    pdf.text(invoice.description||"Aluguel",left,y);
    pdf.text(money(invoice.subtotal),192,y,{align:"right"});
    y+=6;

    if(Number(invoice.adjustments)!==0){
      pdf.text("Ajustes",left,y);
      pdf.text(money(invoice.adjustments),192,y,{align:"right"});
      y+=6;
    }

    y+=4;
    pdf.line(left,y,192,y);
    y+=8;
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(12);
    pdf.text("TOTAL",left,y);
    pdf.text(money(invoice.total),192,y,{align:"right"});
    y+=10;

    pdf.setFontSize(10);
    pdf.text(`Vencimento: ${brDate(invoice.due_date)}`,left,y);
    y+=8;

    pdf.setFont("helvetica","bold");
    pdf.text("Forma de pagamento",left,y);
    y+=6;
    pdf.setFont("helvetica","normal");

    if(invoice.payment_mode==="manual_pix"){
      pdf.text("PIX",left,y); y+=6;
      if(invoice.manual_pix_key){pdf.text(`Chave PIX: ${invoice.manual_pix_key}`,left,y);y+=6;}
      if(invoice.manual_payment_instructions){
        const lines=pdf.splitTextToSize(invoice.manual_payment_instructions,170);
        pdf.text(lines,left,y); y+=lines.length*5;
      }
    }else{
      pdf.text("Asaas - boleto/PIX automatizado",left,y); y+=6;
      if(invoice.asaas_invoice_url){
        pdf.setTextColor(0,0,180);
        pdf.textWithLink("Abrir página de pagamento Asaas",left,y,{url:invoice.asaas_invoice_url});
        pdf.setTextColor(0,0,0);
        y+=6;
      }
      if(invoice.asaas_bank_slip_url){
        pdf.setTextColor(0,0,180);
        pdf.textWithLink("Abrir boleto bancário",left,y,{url:invoice.asaas_bank_slip_url});
        pdf.setTextColor(0,0,0);
        y+=6;
      }
    }

    y+=10;
    pdf.setFontSize(8);
    pdf.setTextColor(90);
    pdf.text("Documento gerado pelo sistema de gestão da imobiliária.",left,y);

    return pdf;
  }

  async function generateAndArchive(){
    if(!invoice)return;
    setGenerating(true);
    setMessage("");

    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setGenerating(false);return;}

    const pdf=buildPdf();
    if(!pdf){setGenerating(false);return;}

    const blob=pdf.output("blob");
    const storagePath=`${user.id}/invoices/${invoice.id}/${crypto.randomUUID()}.pdf`;

    const {error:uploadError}=await supabase.storage
      .from("private-documents")
      .upload(storagePath,blob,{contentType:"application/pdf",upsert:false});

    if(uploadError){
      setGenerating(false);
      setMessage("Erro ao armazenar PDF: "+uploadError.message);
      return;
    }

    const {data:doc,error:docError}=await supabase.from("documents").insert({
      user_id:user.id,
      property_id:invoice.property_id,
      tenant_id:invoice.tenant_id,
      lease_id:invoice.lease_id,
      name:`Fatura ${reference} - ${tenant?.name||"Locatário"}`,
      document_type:"Fatura",
      storage_path:storagePath,
      file_url:null,
      is_private:true,
    }).select("id").single();

    if(docError||!doc){
      await supabase.storage.from("private-documents").remove([storagePath]);
      setGenerating(false);
      setMessage("Erro ao registrar PDF: "+(docError?.message||""));
      return;
    }

    const {error:updateError}=await supabase.from("invoices").update({
      invoice_document_id:doc.id,
      updated_at:new Date().toISOString(),
    }).eq("id",invoice.id);

    if(updateError){
      setGenerating(false);
      setMessage("PDF salvo, mas houve erro ao vincular à fatura: "+updateError.message);
      return;
    }

    pdf.save(`fatura-${reference.replace("/","-")}-${(tenant?.name||"locatario").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}.pdf`);
    setGenerating(false);
    setMessage("Fatura PDF gerada, baixada e arquivada com segurança.");
    await load();
  }

  async function openArchived(){
    if(!invoice?.invoice_document_id)return;
    const {data:doc}=await supabase.from("documents").select("storage_path").eq("id",invoice.invoice_document_id).single();
    if(!doc?.storage_path)return;
    const {data,error}=await supabase.storage.from("private-documents").createSignedUrl(doc.storage_path,60);
    if(error||!data?.signedUrl){alert("Não foi possível abrir o PDF.");return;}
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }

  if(loading)return <Wrapper><div className="dashboard-body"><DashboardHeaderTwo title="Visualizar fatura"/><div className="bg-white card-box border-20">Carregando...</div></div></Wrapper>;

  return <Wrapper><div className="dashboard-body"><div className="position-relative">
    <DashboardHeaderTwo title="Visualizar fatura"/>
    <div className="d-flex justify-content-between align-items-center mb-25">
      <div><h4 className="dash-title-two mb-1">Fatura {reference}</h4><p className="m0">Pré-visualização da fatura da imobiliária.</p></div>
      <button className="btn btn-outline-dark" onClick={()=>router.push("/dashboard/invoices")}>Voltar</button>
    </div>

    <div className="bg-white border-20 p-4 p-lg-5 mb-30" style={{maxWidth:900,margin:"0 auto"}}>
      <div className="d-flex flex-wrap justify-content-between gap-4 border-bottom pb-4 mb-4">
        <div>
          <h2 className="mb-2">{landlord?.display_name||"Imobiliária"}</h2>
          {landlord?.document&&<div>CPF/CNPJ: {landlord.document}</div>}
          {landlordAddress&&<div>{landlordAddress}</div>}
          {(landlord?.email||landlord?.phone)&&<div>{[landlord.email,landlord.phone].filter(Boolean).join(" · ")}</div>}
        </div>
        <div className="text-lg-end">
          <div className="text-uppercase small">Fatura de locação</div>
          <h3 className="mb-1">Ref. {reference}</h3>
          <div>Vencimento: <strong>{invoice?brDate(invoice.due_date):"—"}</strong></div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <small>Inquilino</small>
          <div className="fw-bold">{tenant?.name||"—"}</div>
          {tenant?.document&&<div>CPF/CNPJ: {tenant.document}</div>}
        </div>
        <div className="col-md-6">
          <small>Imóvel</small>
          <div className="fw-bold">{property?.name||"—"}</div>
          <div>{propertyAddress||"—"}</div>
        </div>
      </div>

      <div className="table-responsive mb-4">
        <table className="table">
          <thead><tr><th>Descrição</th><th className="text-end">Valor</th></tr></thead>
          <tbody>
            <tr><td>{invoice?.description||"Aluguel"}</td><td className="text-end">{money(invoice?.subtotal||0)}</td></tr>
            {Number(invoice?.adjustments||0)!==0&&<tr><td>Ajustes</td><td className="text-end">{money(invoice?.adjustments||0)}</td></tr>}
            <tr><td><strong>Total</strong></td><td className="text-end"><strong>{money(invoice?.total||0)}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded" style={{background:"#f7f7f7"}}>
        <h5>Forma de pagamento</h5>
        {invoice?.payment_mode==="manual_pix"?(
          <>
            <div><strong>PIX</strong></div>
            <div>Chave: {invoice.manual_pix_key||"Não informada"}</div>
            {invoice.manual_payment_instructions&&<div className="mt-2">{invoice.manual_payment_instructions}</div>}
          </>
        ):(
          <>
            <div><strong>Asaas — boleto/PIX automatizado</strong></div>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {invoice?.asaas_bank_slip_url&&<a className="btn btn-outline-dark" href={invoice.asaas_bank_slip_url} target="_blank" rel="noreferrer">Abrir boleto</a>}
              {invoice?.asaas_invoice_url&&<a className="btn btn-outline-secondary" href={invoice.asaas_invoice_url} target="_blank" rel="noreferrer">Abrir página Asaas</a>}
              {!invoice?.asaas_payment_id&&<span className="text-muted">Cobrança Asaas ainda não emitida.</span>}
            </div>
          </>
        )}
      </div>
    </div>

    <div className="d-flex flex-wrap gap-2 justify-content-center">
      <button className="dash-btn-two tran3s" onClick={generateAndArchive} disabled={generating}>
        {generating?"Gerando...":"Gerar e arquivar PDF"}
      </button>
      {invoice?.invoice_document_id&&<button className="btn btn-outline-dark" onClick={openArchived}>Abrir PDF arquivado</button>}
    </div>

    {message&&<div className="alert alert-light border mt-25">{message}</div>}
  </div></div></Wrapper>
}