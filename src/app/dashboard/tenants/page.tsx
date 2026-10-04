"use client"

import { FormEvent, useEffect, useMemo, useState } from "react";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type Tenant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  date_of_birth: string | null;
  emergency_contact: string | null;
  employer: string | null;
  monthly_income: number | null;
  notes: string | null;
  created_at: string;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  document: "",
  date_of_birth: "",
  emergency_contact: "",
  employer: "",
  monthly_income: "",
  notes: "",
};

export default function TenantsPage() {
  const supabase = createClient();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function loadTenants() {
    setLoading(true);

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Erro ao carregar locatários: " + error.message);
      setTenants([]);
    } else {
      setTenants(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;

    return tenants.filter((tenant) =>
      [
        tenant.name,
        tenant.email,
        tenant.phone,
        tenant.document,
        tenant.employer,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [tenants, search]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setMessage("");
  }

  function startEdit(tenant: Tenant) {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      document: tenant.document ?? "",
      date_of_birth: tenant.date_of_birth ?? "",
      emergency_contact: tenant.emergency_contact ?? "",
      employer: tenant.employer ?? "",
      monthly_income: tenant.monthly_income?.toString() ?? "",
      notes: tenant.notes ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setMessage("Você precisa estar logado.");
      return;
    }

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      document: form.document.trim() || null,
      date_of_birth: form.date_of_birth || null,
      emergency_contact: form.emergency_contact.trim() || null,
      employer: form.employer.trim() || null,
      monthly_income: form.monthly_income
        ? Number(form.monthly_income.replace(",", "."))
        : null,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase.from("tenants").update(payload).eq("id", editingId)
      : await supabase.from("tenants").insert(payload);

    setSaving(false);

    if (result.error) {
      setMessage(
        (editingId ? "Erro ao atualizar locatário: " : "Erro ao cadastrar locatário: ") +
          result.error.message
      );
      return;
    }

    resetForm();
    await loadTenants();
  }

  async function handleDelete(tenant: Tenant) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${tenant.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenant.id);

    if (error) {
      alert("Erro ao excluir locatário: " + error.message);
      return;
    }

    await loadTenants();
  }

  return (
    <Wrapper>
      <div className="dashboard-body">
        <div className="position-relative">
          <DashboardHeaderTwo title="Locatários" />

          <h2 className="main-title d-block d-lg-none">Locatários</h2>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-25">
            <div>
              <h4 className="dash-title-two mb-1">Locatários</h4>
              <p className="m0">Cadastre e gerencie as pessoas vinculadas aos seus contratos.</p>
            </div>

            <button
              className="dash-btn-two tran3s"
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setEditingId(null);
                  setForm(emptyForm);
                  setShowForm(true);
                }
              }}
            >
              {showForm ? "Fechar formulário" : "+ Novo locatário"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit}>
              <div className="bg-white card-box border-20 mb-40">
                <h4 className="dash-title-three">
                  {editingId ? "Editar locatário" : "Novo locatário"}
                </h4>

                <div className="row">
                  <div className="col-md-8">
                    <div className="dash-input-wrapper mb-30">
                      <label>Nome completo*</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="dash-input-wrapper mb-30">
                      <label>CPF / Documento</label>
                      <input
                        type="text"
                        value={form.document}
                        onChange={(e) =>
                          setForm({ ...form, document: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>E-mail</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Telefone</label>
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="dash-input-wrapper mb-30">
                      <label>Data de nascimento</label>
                      <input
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) =>
                          setForm({ ...form, date_of_birth: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-8">
                    <div className="dash-input-wrapper mb-30">
                      <label>Contato de emergência</label>
                      <input
                        type="text"
                        placeholder="Nome e telefone"
                        value={form.emergency_contact}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            emergency_contact: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Empregador</label>
                      <input
                        type="text"
                        value={form.employer}
                        onChange={(e) =>
                          setForm({ ...form, employer: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Renda mensal</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.monthly_income}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            monthly_income: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="dash-input-wrapper mb-30">
                      <label>Observações</label>
                      <textarea
                        className="size-lg"
                        value={form.notes}
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {message && <p className="mb-20">{message}</p>}

                <div className="button-group d-inline-flex align-items-center">
                  <button
                    type="submit"
                    className="dash-btn-two tran3s me-3"
                    disabled={saving}
                  >
                    {saving
                      ? "Salvando..."
                      : editingId
                      ? "Salvar alterações"
                      : "Cadastrar locatário"}
                  </button>

                  <button
                    type="button"
                    className="dash-cancel-btn tran3s"
                    onClick={resetForm}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="bg-white card-box border-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-25">
              <div>
                <strong>{filteredTenants.length}</strong>{" "}
                {filteredTenants.length === 1 ? "locatário" : "locatários"}
              </div>

              <div style={{ minWidth: 280 }}>
                <input
                  type="search"
                  placeholder="Buscar por nome, CPF, e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    padding: "0 14px",
                  }}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table property-list-table">
                <thead>
                  <tr>
                    <th>Locatário</th>
                    <th>Contato</th>
                    <th>Documento</th>
                    <th>Empregador</th>
                    <th>Renda</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody className="border-0">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5">
                        Carregando locatários...
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5">
                        Nenhum locatário cadastrado.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td>
                          <div className="fw-500 color-dark fs-18">
                            {tenant.name}
                          </div>
                          {tenant.date_of_birth && (
                            <small>
                              Nasc.{" "}
                              {new Date(
                                tenant.date_of_birth + "T12:00:00"
                              ).toLocaleDateString("pt-BR")}
                            </small>
                          )}
                        </td>

                        <td>
                          <div>{tenant.email || "—"}</div>
                          <small>{tenant.phone || ""}</small>
                        </td>

                        <td>{tenant.document || "—"}</td>
                        <td>{tenant.employer || "—"}</td>

                        <td>
                          {tenant.monthly_income != null
                            ? tenant.monthly_income.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                        </td>

                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-dark"
                              onClick={() => startEdit(tenant)}
                            >
                              Editar
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(tenant)}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
