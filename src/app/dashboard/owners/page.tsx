"use client"

import { FormEvent, useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Owner = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  payout_method: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "", document: "", email: "", phone: "", zip_code: "", address: "", number: "",
  complement: "", neighborhood: "", city: "", state: "SP", nationality: "Brasileira",
  marital_status: "", profession: "", rg: "", rg_issuer: "", payout_method: "none", notes: "",
};

export default function OwnersPage() {
  const supabase = createClient();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("owners").select("*").order("name");
    if (error) setMessage("Erro ao carregar proprietários: " + error.message);
    else setOwners((data ?? []) as Owner[]);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter((o) => [o.name,o.document,o.email,o.phone,o.city].filter(Boolean).some(v => String(v).toLowerCase().includes(q)));
  }, [owners, search]);

  function reset() {
    setForm(emptyForm); setEditingId(null); setShowForm(false); setMessage("");
  }

  async function edit(id: string) {
    const { data, error } = await supabase.from("owners").select("*").eq("id", id).single();
    if (error || !data) return;
    setEditingId(id);
    setForm({
      name:data.name ?? "", document:data.document ?? "", email:data.email ?? "", phone:data.phone ?? "",
      zip_code:data.zip_code ?? "", address:data.address ?? "", number:data.number ?? "", complement:data.complement ?? "",
      neighborhood:data.neighborhood ?? "", city:data.city ?? "", state:data.state ?? "SP", nationality:data.nationality ?? "Brasileira",
      marital_status:data.marital_status ?? "", profession:data.profession ?? "", rg:data.rg ?? "", rg_issuer:data.rg_issuer ?? "",
      payout_method:data.payout_method ?? "none", notes:data.notes ?? "",
    });
    setShowForm(true);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setMessage("");
    const { data:{user} } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setMessage("Você precisa estar logado."); return; }
    const payload = {
      user_id:user.id,
      name:form.name.trim(),
      document:form.document.trim() || null,
      email:form.email.trim() || null,
      phone:form.phone.trim() || null,
      zip_code:form.zip_code.trim() || null,
      address:form.address.trim() || null,
      number:form.number.trim() || null,
      complement:form.complement.trim() || null,
      neighborhood:form.neighborhood.trim() || null,
      city:form.city.trim() || null,
      state:form.state.trim() || null,
      nationality:form.nationality.trim() || null,
      marital_status:form.marital_status.trim() || null,
      profession:form.profession.trim() || null,
      rg:form.rg.trim() || null,
      rg_issuer:form.rg_issuer.trim() || null,
      payout_method:form.payout_method,
      notes:form.notes.trim() || null,
    };
    const result = editingId
      ? await supabase.from("owners").update(payload).eq("id", editingId)
      : await supabase.from("owners").insert(payload);
    setSaving(false);
    if (result.error) { setMessage("Erro ao salvar proprietário: " + result.error.message); return; }
    reset(); await load();
  }

  async function remove(owner: Owner) {
    if (!confirm(`Excluir o proprietário "${owner.name}"? Vínculos com imóveis devem ser removidos antes.`)) return;
    const { error } = await supabase.from("owners").delete().eq("id", owner.id);
    if (error) alert("Erro ao excluir: " + error.message); else await load();
  }

  return <Wrapper>
    <div className="dashboard-body"><div className="position-relative">
      <DashboardHeaderTwo title="Proprietários" />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-25">
        <div><h2 className="main-title mb-1">Proprietários</h2><p className="m0">Cadastre titulares e coproprietários dos imóveis.</p></div>
        <button className="dash-btn-two tran3s" onClick={() => showForm ? reset() : setShowForm(true)}>{showForm ? "Fechar" : "+ Novo proprietário"}</button>
      </div>

      {showForm && <form onSubmit={submit}>
        <div className="bg-white card-box border-20 mb-35">
          <h4 className="dash-title-three">{editingId ? "Editar proprietário" : "Novo proprietário"}</h4>
          <div className="row">
            <div className="col-md-8"><div className="dash-input-wrapper mb-25"><label>Nome / Razão social*</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div></div>
            <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>CPF / CNPJ</label><input value={form.document} onChange={e=>setForm({...form,document:e.target.value})}/></div></div>
            <div className="col-md-6"><div className="dash-input-wrapper mb-25"><label>E-mail</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div></div>
            <div className="col-md-6"><div className="dash-input-wrapper mb-25"><label>Telefone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div></div>
            <div className="col-md-3"><div className="dash-input-wrapper mb-25"><label>CEP</label><input value={form.zip_code} onChange={e=>setForm({...form,zip_code:e.target.value})}/></div></div>
            <div className="col-md-6"><div className="dash-input-wrapper mb-25"><label>Endereço</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div></div>
            <div className="col-md-3"><div className="dash-input-wrapper mb-25"><label>Número</label><input value={form.number} onChange={e=>setForm({...form,number:e.target.value})}/></div></div>
            <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Bairro</label><input value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})}/></div></div>
            <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Cidade</label><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></div></div>
            <div className="col-md-2"><div className="dash-input-wrapper mb-25"><label>UF</label><input maxLength={2} value={form.state} onChange={e=>setForm({...form,state:e.target.value.toUpperCase()})}/></div></div>
            <div className="col-md-2"><div className="dash-input-wrapper mb-25"><label>Complemento</label><input value={form.complement} onChange={e=>setForm({...form,complement:e.target.value})}/></div></div>
            <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Profissão</label><input value={form.profession} onChange={e=>setForm({...form,profession:e.target.value})}/></div></div>
            <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Estado civil</label><input value={form.marital_status} onChange={e=>setForm({...form,marital_status:e.target.value})}/></div></div>
            <div className="col-md-4"><div className="dash-input-wrapper mb-25"><label>Forma de repasse</label><select className="nice-select" value={form.payout_method} onChange={e=>setForm({...form,payout_method:e.target.value})}><option value="none">Não configurar</option><option value="pix">PIX</option><option value="bank">Conta bancária</option></select></div></div>
            <div className="col-12"><div className="dash-input-wrapper mb-25"><label>Observações internas</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div></div>
          </div>
          {message && <p>{message}</p>}
          <button className="dash-btn-two tran3s" disabled={saving}>{saving ? "Salvando..." : "Salvar proprietário"}</button>
        </div>
      </form>}

      <div className="bg-white card-box border-20">
        <div className="dash-input-wrapper mb-25"><input placeholder="Buscar por nome, documento, e-mail ou cidade" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="table-responsive">
          <table className="table"><thead><tr><th>Proprietário</th><th>Documento</th><th>Contato</th><th>Cidade</th><th>Repasse</th><th></th></tr></thead>
          <tbody>{filtered.length ? filtered.map(o=><tr key={o.id}>
            <td><strong>{o.name}</strong></td><td>{o.document || "—"}</td><td>{o.email || o.phone || "—"}</td><td>{o.city ? `${o.city}${o.state ? "/"+o.state : ""}` : "—"}</td><td>{o.payout_method === "pix" ? "PIX" : o.payout_method === "bank" ? "Conta bancária" : "Não configurado"}</td>
            <td className="text-end"><button className="btn btn-sm btn-outline-dark me-2" onClick={()=>edit(o.id)}>Editar</button><button className="btn btn-sm btn-outline-danger" onClick={()=>remove(o)}>Excluir</button></td>
          </tr>) : <tr><td colSpan={6} className="text-center py-4">Nenhum proprietário cadastrado.</td></tr>}</tbody></table>
        </div>
      </div>
    </div></div>
  </Wrapper>;
}
