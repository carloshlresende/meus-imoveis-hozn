"use client"

import { FormEvent, useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Unit = {
  id: string;
  property_id: string;
  name: string;
  market_rent: number | null;
  status: string;
  properties: { name: string } | null;
};

type Tenant = { id: string; name: string };

type Lease = {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  adjustment_index: string | null;
  due_day: number | null;
  deposit: number | null;
  late_fee: number | null;
  status: string | null;
  notes: string | null;
  units: { name: string; properties: { name: string } | null } | null;
  tenants: { name: string } | null;
};

const emptyForm = {
  unit_id: "",
  tenant_id: "",
  start_date: "",
  end_date: "",
  rent_amount: "",
  adjustment_index: "IPCA",
  due_day: "10",
  deposit: "",
  late_fee: "",
  status: "active",
  notes: "",
};

const money = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ContractsPage() {
  const supabase = createClient();
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    const [unitsResult, tenantsResult, leasesResult] = await Promise.all([
      supabase
        .from("units")
        .select("id,property_id,name,market_rent,status,properties(name)")
        .order("created_at"),
      supabase.from("tenants").select("id,name").order("name"),
      supabase
        .from("leases")
        .select("id,property_id,unit_id,tenant_id,start_date,end_date,rent_amount,adjustment_index,due_day,deposit,late_fee,status,notes,units(name,properties(name)),tenants(name)")
        .order("created_at", { ascending: false }),
    ]);

    if (unitsResult.error || tenantsResult.error || leasesResult.error) {
      setMessage(
        unitsResult.error?.message ||
          tenantsResult.error?.message ||
          leasesResult.error?.message ||
          "Erro ao carregar dados."
      );
    }

    setUnits((unitsResult.data as unknown as Unit[]) ?? []);
    setTenants((tenantsResult.data as Tenant[]) ?? []);
    setLeases((leasesResult.data as unknown as Lease[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === form.unit_id),
    [units, form.unit_id]
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setMessage("");
  }

  function newLease() {
    const today = new Date();
    const end = new Date(today);
    end.setFullYear(end.getFullYear() + 1);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    setForm({ ...emptyForm, start_date: iso(today), end_date: iso(end) });
    setEditingId(null);
    setShowForm(true);
  }

  function editLease(lease: Lease) {
    setEditingId(lease.id);
    setForm({
      unit_id: lease.unit_id ?? "",
      tenant_id: lease.tenant_id ?? "",
      start_date: lease.start_date ?? "",
      end_date: lease.end_date ?? "",
      rent_amount: lease.rent_amount?.toString() ?? "",
      adjustment_index: lease.adjustment_index ?? "IPCA",
      due_day: lease.due_day?.toString() ?? "10",
      deposit: lease.deposit?.toString() ?? "",
      late_fee: lease.late_fee?.toString() ?? "",
      status: lease.status ?? "active",
      notes: lease.notes ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selectedUnit || !form.tenant_id) return;
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMessage("Você precisa estar logado.");
      return;
    }

    const payload = {
      user_id: user.id,
      property_id: selectedUnit.property_id,
      unit_id: selectedUnit.id,
      tenant_id: form.tenant_id,
      start_date: form.start_date,
      end_date: form.end_date,
      rent_amount: Number(form.rent_amount.replace(",", ".")) || 0,
      adjustment_index: form.adjustment_index || null,
      due_day: Math.min(31, Math.max(1, Number(form.due_day) || 1)),
      deposit: Number(form.deposit.replace(",", ".")) || 0,
      late_fee: Number(form.late_fee.replace(",", ".")) || 0,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase.from("leases").update(payload).eq("id", editingId)
      : await supabase.from("leases").insert(payload);

    if (result.error) {
      setSaving(false);
      setMessage("Erro ao salvar contrato: " + result.error.message);
      return;
    }

    await supabase
      .from("units")
      .update({ status: form.status === "active" ? "occupied" : "vacant" })
      .eq("id", selectedUnit.id);

    await supabase
      .from("properties")
      .update({ status: form.status === "active" ? "rented" : "vacant" })
      .eq("id", selectedUnit.property_id);

    setSaving(false);
    resetForm();
    await loadData();
  }

  async function remove(lease: Lease) {
    if (!window.confirm("Excluir este contrato e todas as cobranças/pagamentos vinculados?")) return;
    const { error } = await supabase.from("leases").delete().eq("id", lease.id);
    if (error) {
      alert("Erro ao excluir contrato: " + error.message);
      return;
    }
    if (lease.unit_id) {
      await supabase.from("units").update({ status: "vacant" }).eq("id", lease.unit_id);
    }
    if (lease.property_id) {
      await supabase.from("properties").update({ status: "vacant" }).eq("id", lease.property_id);
    }
    await loadData();
  }

  return (
    <Wrapper>
      <div className="dashboard-body">
        <div className="position-relative">
          <DashboardHeaderTwo title="Contratos" />
          <h2 className="main-title d-block d-lg-none">Contratos</h2>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-25">
            <div>
              <h4 className="dash-title-two mb-1">Contratos de locação</h4>
              <p className="m0">Vincule imóvel, unidade e locatário e defina as condições financeiras.</p>
            </div>
            <button className="dash-btn-two tran3s" onClick={showForm ? resetForm : newLease}>
              {showForm ? "Fechar formulário" : "+ Novo contrato"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={save}>
              <div className="bg-white card-box border-20 mb-40">
                <h4 className="dash-title-three">{editingId ? "Editar contrato" : "Novo contrato"}</h4>
                <div className="row">
                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Imóvel / Unidade*</label>
                      <select
                        className="nice-select"
                        value={form.unit_id}
                        onChange={(e) => {
                          const u = units.find((x) => x.id === e.target.value);
                          setForm({
                            ...form,
                            unit_id: e.target.value,
                            rent_amount:
                              !editingId && u?.market_rent
                                ? String(u.market_rent)
                                : form.rent_amount,
                          });
                        }}
                        required
                      >
                        <option value="">Selecione</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.properties?.name ?? "Imóvel"} · {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Locatário principal*</label>
                      <select
                        className="nice-select"
                        value={form.tenant_id}
                        onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                        required
                      >
                        <option value="">Selecione</option>
                        {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Início*</label><input type="date" value={form.start_date} onChange={(e)=>setForm({...form,start_date:e.target.value})} required/>
                  </div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Fim*</label><input type="date" value={form.end_date} onChange={(e)=>setForm({...form,end_date:e.target.value})} required/>
                  </div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Aluguel mensal*</label><input type="number" step="0.01" value={form.rent_amount} onChange={(e)=>setForm({...form,rent_amount:e.target.value})} required/>
                  </div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Dia do vencimento</label><input type="number" min="1" max="31" value={form.due_day} onChange={(e)=>setForm({...form,due_day:e.target.value})}/>
                  </div></div>

                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Caução / depósito</label><input type="number" step="0.01" value={form.deposit} onChange={(e)=>setForm({...form,deposit:e.target.value})}/>
                  </div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Multa por atraso</label><input type="number" step="0.01" value={form.late_fee} onChange={(e)=>setForm({...form,late_fee:e.target.value})}/>
                  </div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Índice de reajuste</label>
                    <select className="nice-select" value={form.adjustment_index} onChange={(e)=>setForm({...form,adjustment_index:e.target.value})}>
                      <option value="IPCA">IPCA</option><option value="IGP-M">IGP-M</option><option value="INPC">INPC</option><option value="Outro">Outro</option>
                    </select>
                  </div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30">
                    <label>Status</label>
                    <select className="nice-select" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>
                      <option value="upcoming">Futuro</option><option value="active">Ativo</option><option value="ended">Encerrado</option><option value="cancelled">Cancelado</option>
                    </select>
                  </div></div>

                  <div className="col-12"><div className="dash-input-wrapper mb-30">
                    <label>Observações</label><textarea className="size-lg" value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/>
                  </div></div>
                </div>

                {message && <p>{message}</p>}
                <button type="submit" className="dash-btn-two tran3s me-3" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar contrato"}
                </button>
                <button type="button" className="dash-cancel-btn tran3s" onClick={resetForm}>Cancelar</button>
              </div>
            </form>
          )}

          <div className="bg-white card-box border-20">
            <div className="table-responsive">
              <table className="table property-list-table">
                <thead><tr><th>Imóvel / Unidade</th><th>Locatário</th><th>Período</th><th>Aluguel</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody className="border-0">
                  {loading ? <tr><td colSpan={6} className="text-center py-5">Carregando contratos...</td></tr> :
                  leases.length === 0 ? <tr><td colSpan={6} className="text-center py-5">Nenhum contrato cadastrado.</td></tr> :
                  leases.map((l) => (
                    <tr key={l.id}>
                      <td><strong>{l.units?.properties?.name ?? "—"}</strong><br/><small>{l.units?.name ?? "—"}</small></td>
                      <td>{l.tenants?.name ?? "—"}</td>
                      <td>{l.start_date ? new Date(l.start_date+"T12:00:00").toLocaleDateString("pt-BR") : "—"}<br/><small>até {l.end_date ? new Date(l.end_date+"T12:00:00").toLocaleDateString("pt-BR") : "—"}</small></td>
                      <td>{money(l.rent_amount)}<br/><small>vence dia {l.due_day ?? "—"}</small></td>
                      <td>{l.status === "active" ? "Ativo" : l.status === "upcoming" ? "Futuro" : l.status === "ended" ? "Encerrado" : "Cancelado"}</td>
                      <td><div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-dark" onClick={()=>editLease(l)}>Editar</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(l)}>Excluir</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
