"use client"

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Lease = {
  id: string;
  property_id: string | null;
  tenant_id: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  adjustment_index: string | null;
  due_day: number | null;
  deposit: number | null;
  late_fee: number | null;
  contract_template_id: string | null;
  generated_contract_document_id: string | null;
};

type Property = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  water_account_number: string | null;
  electricity_account_number: string | null;
};

type Tenant = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
};

type Template = {
  id: string;
  name: string;
  template_text: string;
};

type Landlord = {
  display_name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

const emptyLandlord: Landlord = {
  display_name: "",
  document: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "SP",
  zip_code: "",
};

const brDate = (date: string | null) =>
  date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR") : "";

const brMoney = (value: number | null) =>
  Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function GenerateContractPage() {
  const params = useParams();
  const router = useRouter();
  const leaseId = params.id as string;
  const supabase = createClient();

  const [lease, setLease] = useState<Lease | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [landlord, setLandlord] = useState<Landlord>(emptyLandlord);
  const [finalText, setFinalText] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedDocumentId, setGeneratedDocumentId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.push("/login");
      return;
    }

    const [leaseResult, templatesResult, profileResult] = await Promise.all([
      supabase.from("leases").select("*").eq("id", leaseId).single(),
      supabase
        .from("contract_templates")
        .select("id,name,template_text")
        .eq("is_active", true)
        .order("created_at"),
      supabase
        .from("landlord_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (leaseResult.error || !leaseResult.data) {
      setMessage("Não foi possível carregar o contrato.");
      setLoading(false);
      return;
    }

    const loadedLease = leaseResult.data as Lease;
    setLease(loadedLease);
    setGeneratedDocumentId(loadedLease.generated_contract_document_id ?? null);

    const [propertyResult, tenantResult] = await Promise.all([
      loadedLease.property_id
        ? supabase
            .from("properties")
            .select("id,name,address,city,state,water_account_number,electricity_account_number")
            .eq("id", loadedLease.property_id)
            .single()
        : Promise.resolve({ data: null, error: null } as any),
      loadedLease.tenant_id
        ? supabase
            .from("tenants")
            .select("id,name,document,email,phone")
            .eq("id", loadedLease.tenant_id)
            .single()
        : Promise.resolve({ data: null, error: null } as any),
    ]);

    setProperty((propertyResult.data as Property | null) ?? null);
    setTenant((tenantResult.data as Tenant | null) ?? null);
    setTemplates((templatesResult.data as Template[]) ?? []);
    setLandlord(
      profileResult.data
        ? {
            display_name: profileResult.data.display_name ?? "",
            document: profileResult.data.document ?? "",
            email: profileResult.data.email ?? "",
            phone: profileResult.data.phone ?? "",
            address: profileResult.data.address ?? "",
            city: profileResult.data.city ?? "",
            state: profileResult.data.state ?? "SP",
            zip_code: profileResult.data.zip_code ?? "",
          }
        : emptyLandlord
    );

    const preferred =
      loadedLease.contract_template_id &&
      (templatesResult.data ?? []).some((t: any) => t.id === loadedLease.contract_template_id)
        ? loadedLease.contract_template_id
        : templatesResult.data?.[0]?.id ?? "";

    setTemplateId(preferred);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [leaseId]);

  const address = useMemo(() => {
    if (!property) return "";
    return [
      property.address,
      property.city,
      property.state,
    ].filter(Boolean).join(", ");
  }, [property]);

  function fillTemplate(templateText: string) {
    if (!lease) return templateText;

    const values: Record<string, string> = {
      locador_nome: landlord.display_name || "[PREENCHER LOCADOR]",
      locador_documento: landlord.document || "",
      locador_email: landlord.email || "",
      locador_telefone: landlord.phone || "",
      locador_endereco: [landlord.address, landlord.city, landlord.state]
        .filter(Boolean)
        .join(", "),
      locatario_nome: tenant?.name || "",
      locatario_documento: tenant?.document || "",
      locatario_email: tenant?.email || "",
      locatario_telefone: tenant?.phone || "",
      imovel_nome: property?.name || "",
      imovel_endereco: address,
      rgi_sabesp: property?.water_account_number || "",
      uc_cpfl: property?.electricity_account_number || "",
      valor_aluguel: brMoney(lease.rent_amount),
      dia_vencimento: String(lease.due_day ?? ""),
      inicio_contrato: brDate(lease.start_date),
      fim_contrato: brDate(lease.end_date),
      indice_reajuste: lease.adjustment_index || "",
      valor_caucao: brMoney(lease.deposit),
      multa_atraso: brMoney(lease.late_fee),
    };

    return templateText.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : `{{${key}}}`
    );
  }

  useEffect(() => {
    const template = templates.find((t) => t.id === templateId);
    if (template) setFinalText(fillTemplate(template.template_text));
  }, [templateId, templates, lease, property, tenant, landlord]);

  async function saveLandlord(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingProfile(false);
      return;
    }

    const { error } = await supabase.from("landlord_profiles").upsert({
      user_id: user.id,
      ...landlord,
      display_name: landlord.display_name.trim(),
      document: landlord.document?.trim() || null,
      email: landlord.email?.trim() || null,
      phone: landlord.phone?.trim() || null,
      address: landlord.address?.trim() || null,
      city: landlord.city?.trim() || null,
      state: landlord.state?.trim() || null,
      zip_code: landlord.zip_code?.trim() || null,
      updated_at: new Date().toISOString(),
    });

    setSavingProfile(false);
    setMessage(error ? "Erro ao salvar dados do locador: " + error.message : "Dados do locador salvos.");
  }

  function createPdfBlob() {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    pdf.setProperties({
      title: `Contrato de locação - ${property?.name ?? "Imóvel"}`,
      subject: "Contrato de locação",
      author: landlord.display_name || "Locador",
    });

    pdf.setFont("times", "bold");
    pdf.setFontSize(15);
    pdf.text("CONTRATO DE LOCAÇÃO", 105, 20, { align: "center" });

    pdf.setFont("times", "normal");
    pdf.setFontSize(11);

    const marginX = 20;
    const maxWidth = 170;
    const lineHeight = 5.5;
    const paragraphs = finalText.split(/\n/);
    let y = 32;

    for (const paragraph of paragraphs) {
      const lines = paragraph.trim()
        ? pdf.splitTextToSize(paragraph, maxWidth)
        : [""];

      for (const line of lines) {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, marginX, y);
        y += lineHeight;
      }

      y += 1.5;
    }

    return pdf.output("blob");
  }

  async function generatePdf() {
    if (!lease || !property || !tenant || !templateId || !finalText.trim()) {
      setMessage("Selecione um modelo e confira os dados antes de gerar.");
      return;
    }

    if (!landlord.display_name.trim()) {
      setMessage("Preencha e salve os dados do locador/imobiliária antes de gerar o contrato.");
      return;
    }

    setGenerating(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setGenerating(false);
      return;
    }

    const blob = createPdfBlob();
    const storagePath = `${user.id}/contracts/${lease.id}/${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("private-documents")
      .upload(storagePath, blob, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      setGenerating(false);
      setMessage("Erro ao armazenar o PDF: " + uploadError.message);
      return;
    }

    const { data: documentData, error: documentError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        property_id: lease.property_id,
        tenant_id: lease.tenant_id,
        lease_id: lease.id,
        name: `Contrato de locação - ${tenant.name} - ${property.name}`,
        document_type: "Contrato gerado",
        storage_path: storagePath,
        file_url: null,
        is_private: true,
      })
      .select("id")
      .single();

    if (documentError || !documentData) {
      await supabase.storage.from("private-documents").remove([storagePath]);
      setGenerating(false);
      setMessage("Erro ao registrar o contrato: " + (documentError?.message ?? ""));
      return;
    }

    const { error: leaseError } = await supabase
      .from("leases")
      .update({
        contract_template_id: templateId,
        generated_contract_document_id: documentData.id,
        generated_contract_at: new Date().toISOString(),
      })
      .eq("id", lease.id);

    setGenerating(false);

    if (leaseError) {
      setMessage("PDF armazenado, mas houve erro ao vincular ao contrato: " + leaseError.message);
      return;
    }

    setGeneratedDocumentId(documentData.id);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    // Download is generated again from the exact reviewed text.
    const blobForDownload = createPdfBlob();
    const url = URL.createObjectURL(blobForDownload);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contrato-${property.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    setMessage("Contrato gerado, baixado e armazenado com segurança.");
  }

  async function openGeneratedDocument() {
    if (!generatedDocumentId) return;

    const { data: docData, error: docError } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", generatedDocumentId)
      .single();

    if (docError || !docData?.storage_path) {
      alert("Documento não encontrado.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("private-documents")
      .createSignedUrl(docData.storage_path, 60);

    if (error || !data?.signedUrl) {
      alert("Não foi possível abrir o contrato.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <Wrapper>
        <div className="dashboard-body">
          <DashboardHeaderTwo title="Gerar contrato" />
          <div className="bg-white card-box border-20">Carregando...</div>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="dashboard-body">
        <div className="position-relative">
          <DashboardHeaderTwo title="Gerar contrato" />
          <h2 className="main-title d-block d-lg-none">Gerar contrato</h2>

          <div className="bg-white card-box border-20 mb-40">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h4 className="dash-title-three mb-1">{property?.name ?? "Contrato"}</h4>
                <p className="m0">
                  Locatário: <strong>{tenant?.name ?? "—"}</strong> · Aluguel:{" "}
                  <strong>{brMoney(lease?.rent_amount ?? 0)}</strong>
                </p>
              </div>
              <div className="d-flex gap-2">
                {generatedDocumentId && (
                  <button className="btn btn-outline-dark" onClick={openGeneratedDocument}>
                    Abrir PDF arquivado
                  </button>
                )}
                <button className="btn btn-outline-secondary" onClick={() => router.push("/dashboard/contracts")}>
                  Voltar
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={saveLandlord}>
            <div className="bg-white card-box border-20 mb-40">
              <h4 className="dash-title-three">Dados do locador / imobiliária</h4>
              <p className="mb-30">Salvos uma vez e reutilizados nos próximos contratos.</p>

              <div className="row">
                <div className="col-md-6"><div className="dash-input-wrapper mb-30">
                  <label>Nome / Razão social*</label>
                  <input value={landlord.display_name} onChange={(e)=>setLandlord({...landlord,display_name:e.target.value})} required />
                </div></div>
                <div className="col-md-6"><div className="dash-input-wrapper mb-30">
                  <label>CPF / CNPJ</label>
                  <input value={landlord.document ?? ""} onChange={(e)=>setLandlord({...landlord,document:e.target.value})} />
                </div></div>
                <div className="col-md-6"><div className="dash-input-wrapper mb-30">
                  <label>E-mail</label>
                  <input type="email" value={landlord.email ?? ""} onChange={(e)=>setLandlord({...landlord,email:e.target.value})} />
                </div></div>
                <div className="col-md-6"><div className="dash-input-wrapper mb-30">
                  <label>Telefone</label>
                  <input value={landlord.phone ?? ""} onChange={(e)=>setLandlord({...landlord,phone:e.target.value})} />
                </div></div>
                <div className="col-md-6"><div className="dash-input-wrapper mb-30">
                  <label>Endereço</label>
                  <input value={landlord.address ?? ""} onChange={(e)=>setLandlord({...landlord,address:e.target.value})} />
                </div></div>
                <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                  <label>Cidade</label>
                  <input value={landlord.city ?? ""} onChange={(e)=>setLandlord({...landlord,city:e.target.value})} />
                </div></div>
                <div className="col-md-1"><div className="dash-input-wrapper mb-30">
                  <label>UF</label>
                  <input maxLength={2} value={landlord.state ?? ""} onChange={(e)=>setLandlord({...landlord,state:e.target.value.toUpperCase()})} />
                </div></div>
                <div className="col-md-2"><div className="dash-input-wrapper mb-30">
                  <label>CEP</label>
                  <input value={landlord.zip_code ?? ""} onChange={(e)=>setLandlord({...landlord,zip_code:e.target.value})} />
                </div></div>
              </div>

              <button type="submit" className="btn btn-outline-dark" disabled={savingProfile}>
                {savingProfile ? "Salvando..." : "Salvar meus dados"}
              </button>
            </div>
          </form>

          <div className="bg-white card-box border-20 mb-40">
            <h4 className="dash-title-three">Modelo e preenchimento automático</h4>

            <div className="dash-input-wrapper mb-30">
              <label>Modelo de contrato*</label>
              <select className="nice-select" value={templateId} onChange={(e)=>setTemplateId(e.target.value)}>
                <option value="">Selecione um modelo</option>
                {templates.map((template)=>(
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            {templates.length === 0 && (
              <div className="alert alert-warning">
                Nenhum modelo disponível. Cadastre primeiro em “Modelos de contrato”.
              </div>
            )}

            <div className="dash-input-wrapper mb-20">
              <label>Texto final — revise antes de gerar</label>
              <textarea
                style={{ minHeight: 600, fontFamily: "Georgia, serif", lineHeight: 1.6 }}
                value={finalText}
                onChange={(e)=>setFinalText(e.target.value)}
              />
            </div>

            <p className="mb-20">
              O texto acima já recebeu os dados do locatário, imóvel, RGI SABESP, UC CPFL e condições do contrato.
              Você pode fazer ajustes finais antes de gerar o PDF.
            </p>

            <button className="dash-btn-two tran3s" onClick={generatePdf} disabled={generating || !templateId}>
              {generating ? "Gerando PDF..." : "Gerar e arquivar PDF"}
            </button>

            {message && <div className="alert alert-light border mt-25">{message}</div>}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
