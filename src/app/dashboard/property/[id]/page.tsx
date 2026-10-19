"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Tab = "overview" | "rental" | "finance" | "documents" | "utilities";

type PropertyRow = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  type: string | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  estimated_value: number | null;
  status: string | null;
  image_url: string | null;
  water_provider: string | null;
  water_account_number: string | null;
  electricity_provider: string | null;
  electricity_account_number: string | null;
  utility_transfer_notes: string | null;
};

type UnitRow = {
  id: string;
  name: string;
  status: string | null;
  market_rent: number | null;
};

type LeaseRow = {
  id: string;
  unit_id: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  due_day: number | null;
  status: string | null;
  deposit: number | null;
};

type TenantRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type ChargeRow = {
  id: string;
  lease_id: string;
  period: string;
  due_date: string | null;
  amount: number;
  amount_paid: number;
  status: string;
};

type InvoiceRow = {
  id: string;
  period: string;
  due_date: string;
  total: number;
  status: string;
  asaas_status: string | null;
};

type DocumentRow = {
  id: string;
  name: string;
  document_type: string | null;
  created_at: string;
};

const money = (value: number | null | undefined) =>
  Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const date = (value: string | null | undefined) =>
  value ? new Date(value + (value.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR") : "—";

const statusLabel = (status: string | null | undefined) => {
  const labels: Record<string, string> = {
    vacant: "Vago",
    rented: "Alugado",
    occupied: "Ocupado",
    turnover: "Em preparação",
    unavailable: "Indisponível",
    active: "Ativo",
    draft: "Rascunho",
    ended: "Encerrado",
    open: "Em aberto",
    partial: "Parcial",
    paid: "Pago",
    overdue: "Atrasado",
    waived: "Dispensado",
    pending: "Pendente",
    issued: "Emitida",
    cancelled: "Cancelada",
  };
  return status ? labels[status] ?? status : "—";
};

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");

      const propertyResult = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (propertyResult.error || !propertyResult.data) {
        setMessage("Não foi possível carregar este imóvel.");
        setLoading(false);
        return;
      }

      const propertyData = propertyResult.data as PropertyRow;
      setProperty(propertyData);

      const [unitsResult, invoiceResult, documentResult] = await Promise.all([
        supabase.from("units").select("id,name,status,market_rent").eq("property_id", propertyId).order("created_at"),
        supabase.from("invoices").select("id,period,due_date,total,status,asaas_status").eq("property_id", propertyId).order("due_date", { ascending: false }),
        supabase.from("documents").select("id,name,document_type,created_at").eq("property_id", propertyId).order("created_at", { ascending: false }),
      ]);

      const unitRows = (unitsResult.data ?? []) as UnitRow[];
      setUnits(unitRows);
      setInvoices((invoiceResult.data ?? []) as InvoiceRow[]);
      setDocuments((documentResult.data ?? []) as DocumentRow[]);

      const unitIds = unitRows.map((unit) => unit.id);
      if (unitIds.length === 0) {
        setLeases([]);
        setTenants([]);
        setCharges([]);
        setLoading(false);
        return;
      }

      const leasesResult = await supabase
        .from("leases")
        .select("id,unit_id,start_date,end_date,rent_amount,due_day,status,deposit")
        .in("unit_id", unitIds)
        .order("start_date", { ascending: false });

      const leaseRows = (leasesResult.data ?? []) as LeaseRow[];
      setLeases(leaseRows);

      const leaseIds = leaseRows.map((lease) => lease.id);
      if (leaseIds.length === 0) {
        setTenants([]);
        setCharges([]);
        setLoading(false);
        return;
      }

      const [linksResult, chargesResult] = await Promise.all([
        supabase.from("lease_tenants").select("tenant_id").in("lease_id", leaseIds),
        supabase.from("rent_charges").select("id,lease_id,period,due_date,amount,amount_paid,status").in("lease_id", leaseIds).order("due_date", { ascending: false }),
      ]);

      setCharges((chargesResult.data ?? []) as ChargeRow[]);

      const tenantIds = Array.from(new Set((linksResult.data ?? []).map((row: any) => row.tenant_id).filter(Boolean)));
      if (tenantIds.length > 0) {
        const tenantsResult = await supabase
          .from("tenants")
          .select("id,name,email,phone")
          .in("id", tenantIds);
        setTenants((tenantsResult.data ?? []) as TenantRow[]);
      } else {
        setTenants([]);
      }

      setLoading(false);
    }

    load();
  }, [propertyId]);

  const activeLease = useMemo(
    () => leases.find((lease) => lease.status === "active") ?? leases[0] ?? null,
    [leases]
  );

  const openBalance = useMemo(
    () => charges.reduce((sum, item) => sum + Math.max(Number(item.amount) - Number(item.amount_paid ?? 0), 0), 0),
    [charges]
  );

  const paidTotal = useMemo(
    () => charges.reduce((sum, item) => sum + Number(item.amount_paid ?? 0), 0),
    [charges]
  );

  const tabButton = (key: Tab, label: string) => (
    <button
      type="button"
      className={`btn ${tab === key ? "btn-dark" : "btn-outline-secondary"} rounded-pill px-4`}
      onClick={() => setTab(key)}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <Wrapper>
        <div className="dashboard-body">
          <div className="position-relative">
            <DashboardHeaderTwo title="Imóvel" />
            <div className="bg-white card-box border-20">Carregando imóvel...</div>
          </div>
        </div>
      </Wrapper>
    );
  }

  if (!property) {
    return (
      <Wrapper>
        <div className="dashboard-body">
          <div className="position-relative">
            <DashboardHeaderTwo title="Imóvel" />
            <div className="bg-white card-box border-20">{message || "Imóvel não encontrado."}</div>
          </div>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="dashboard-body">
        <div className="position-relative">
          <DashboardHeaderTwo title="Detalhes do imóvel" />

          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-30">
            <div>
              <Link href="/dashboard/properties-list" className="text-muted d-inline-block mb-2">
                ← Meus imóveis
              </Link>
              <h2 className="main-title mb-1">{property.name}</h2>
              <div className="text-muted">
                {property.address}{property.city ? ` · ${property.city}` : ""}{property.state ? `/${property.state}` : ""}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Link href={`/dashboard/edit-property/${property.id}`} className="dash-btn-two tran3s">
                Editar imóvel
              </Link>
              <Link href={`/dashboard/property-documents/${property.id}`} className="btn btn-outline-dark rounded-pill px-4">
                Documentos
              </Link>
            </div>
          </div>

          <div className="row g-3 mb-30">
            <div className="col-md-3">
              <div className="bg-white card-box border-20 h-100">
                <div className="text-muted fs-14">Status</div>
                <div className="fw-500 fs-20">{statusLabel(property.status)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-white card-box border-20 h-100">
                <div className="text-muted fs-14">Aluguel atual</div>
                <div className="fw-500 fs-20">{money(activeLease?.rent_amount ?? units[0]?.market_rent)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-white card-box border-20 h-100">
                <div className="text-muted fs-14">Saldo em aberto</div>
                <div className="fw-500 fs-20">{money(openBalance)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-white card-box border-20 h-100">
                <div className="text-muted fs-14">Documentos</div>
                <div className="fw-500 fs-20">{documents.length}</div>
              </div>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mb-30">
            {tabButton("overview", "Visão geral")}
            {tabButton("rental", "Locação")}
            {tabButton("finance", "Financeiro")}
            {tabButton("documents", "Documentos")}
            {tabButton("utilities", "Água e energia")}
          </div>

          {tab === "overview" && (
            <div className="row g-4">
              <div className="col-lg-7">
                <div className="bg-white card-box border-20 h-100">
                  <h4 className="dash-title-three mb-25">Dados do imóvel</h4>
                  <div className="row g-3">
                    <div className="col-sm-6"><span className="text-muted d-block">Tipo</span><strong>{property.type || "—"}</strong></div>
                    <div className="col-sm-6"><span className="text-muted d-block">Valor estimado</span><strong>{money(property.estimated_value)}</strong></div>
                    <div className="col-sm-4"><span className="text-muted d-block">Área</span><strong>{property.area ? `${property.area} m²` : "—"}</strong></div>
                    <div className="col-sm-4"><span className="text-muted d-block">Quartos</span><strong>{property.bedrooms ?? "—"}</strong></div>
                    <div className="col-sm-4"><span className="text-muted d-block">Banheiros</span><strong>{property.bathrooms ?? "—"}</strong></div>
                  </div>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="bg-white card-box border-20 h-100">
                  <h4 className="dash-title-three mb-25">Resumo operacional</h4>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span>Unidades</span><strong>{units.length}</strong></div>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span>Locações</span><strong>{leases.length}</strong></div>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span>Locatários vinculados</span><strong>{tenants.length}</strong></div>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span>Faturas</span><strong>{invoices.length}</strong></div>
                  <div className="d-flex justify-content-between py-2"><span>Total recebido</span><strong>{money(paidTotal)}</strong></div>
                </div>
              </div>
            </div>
          )}

          {tab === "rental" && (
            <div className="row g-4">
              <div className="col-lg-7">
                <div className="bg-white card-box border-20 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-25">
                    <h4 className="dash-title-three m0">Locação</h4>
                    <Link href="/dashboard/contracts" className="text-decoration-underline">Gerenciar contratos</Link>
                  </div>
                  {activeLease ? (
                    <div className="row g-3">
                      <div className="col-sm-6"><span className="text-muted d-block">Status</span><strong>{statusLabel(activeLease.status)}</strong></div>
                      <div className="col-sm-6"><span className="text-muted d-block">Aluguel</span><strong>{money(activeLease.rent_amount)}</strong></div>
                      <div className="col-sm-6"><span className="text-muted d-block">Início</span><strong>{date(activeLease.start_date)}</strong></div>
                      <div className="col-sm-6"><span className="text-muted d-block">Fim</span><strong>{date(activeLease.end_date)}</strong></div>
                      <div className="col-sm-6"><span className="text-muted d-block">Vencimento</span><strong>{activeLease.due_day ? `Dia ${activeLease.due_day}` : "—"}</strong></div>
                      <div className="col-sm-6"><span className="text-muted d-block">Caução</span><strong>{money(activeLease.deposit)}</strong></div>
                    </div>
                  ) : (
                    <p className="m0">Nenhuma locação vinculada a este imóvel.</p>
                  )}
                </div>
              </div>
              <div className="col-lg-5">
                <div className="bg-white card-box border-20 h-100">
                  <h4 className="dash-title-three mb-25">Locatários</h4>
                  {tenants.length ? tenants.map((tenant) => (
                    <div key={tenant.id} className="pb-3 mb-3 border-bottom">
                      <strong className="d-block">{tenant.name}</strong>
                      <span className="text-muted d-block">{tenant.email || "Sem e-mail"}</span>
                      <span className="text-muted">{tenant.phone || "Sem telefone"}</span>
                    </div>
                  )) : <p className="m0">Nenhum locatário vinculado.</p>}
                </div>
              </div>
            </div>
          )}

          {tab === "finance" && (
            <div className="bg-white card-box border-20">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-25">
                <h4 className="dash-title-three m0">Financeiro do imóvel</h4>
                <Link href="/dashboard/invoices" className="dash-btn-two tran3s">Abrir faturas</Link>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Competência</th><th>Vencimento</th><th>Total</th><th>Pago</th><th>Status</th></tr></thead>
                  <tbody>
                    {charges.length ? charges.slice(0, 12).map((item) => (
                      <tr key={item.id}>
                        <td>{item.period}</td>
                        <td>{date(item.due_date)}</td>
                        <td>{money(item.amount)}</td>
                        <td>{money(item.amount_paid)}</td>
                        <td>{statusLabel(item.status)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center py-4">Nenhuma cobrança vinculada a este imóvel.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "documents" && (
            <div className="bg-white card-box border-20">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-25">
                <h4 className="dash-title-three m0">Documentos do imóvel</h4>
                <Link href={`/dashboard/property-documents/${property.id}`} className="dash-btn-two tran3s">Gerenciar documentos</Link>
              </div>
              {documents.length ? documents.map((doc) => (
                <div key={doc.id} className="d-flex justify-content-between align-items-center py-3 border-bottom">
                  <div><strong className="d-block">{doc.name}</strong><span className="text-muted">{doc.document_type || "Documento"}</span></div>
                  <span className="text-muted">{date(doc.created_at)}</span>
                </div>
              )) : <p className="m0">Nenhum documento armazenado.</p>}
            </div>
          )}

          {tab === "utilities" && (
            <div className="bg-white card-box border-20">
              <h4 className="dash-title-three mb-25">Água e energia</h4>
              <div className="row g-4">
                <div className="col-md-6">
                  <span className="text-muted d-block">Água</span>
                  <strong>{property.water_provider || "SABESP"}</strong>
                  <div>RGI: {property.water_account_number || "Não informado"}</div>
                </div>
                <div className="col-md-6">
                  <span className="text-muted d-block">Energia</span>
                  <strong>{property.electricity_provider || "CPFL"}</strong>
                  <div>Instalação / UC: {property.electricity_account_number || "Não informado"}</div>
                </div>
                <div className="col-12">
                  <span className="text-muted d-block">Observações sobre titularidade</span>
                  <div>{property.utility_transfer_notes || "Nenhuma observação cadastrada."}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
