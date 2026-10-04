"use client"

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

const AddPropertyBody = () => {
  const supabase = createClient();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [type, setType] = useState("Apartamento");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");

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
      setMessage("Você precisa estar logado para cadastrar um imóvel.");
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("properties").insert({
      user_id: user.id,
      name,
      address,
      city: city || null,
      state: state || null,
      type,
      area: area ? Number(area.replace(",", ".")) : null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      estimated_value: estimatedValue
        ? Number(estimatedValue.replace(",", "."))
        : null,
      status: "vacant",
    });

    setSaving(false);

    if (error) {
      setMessage(`Erro ao salvar imóvel: ${error.message}`);
      return;
    }

    router.push("/dashboard/properties-list");
    router.refresh();
  }

  return (
    <div className="dashboard-body">
      <div className="position-relative">
        <DashboardHeaderTwo title="Adicionar imóvel" />
        <h2 className="main-title d-block d-lg-none">Adicionar imóvel</h2>

        <form onSubmit={handleSubmit}>
          <div className="bg-white card-box border-20">
            <h4 className="dash-title-three">Dados do imóvel</h4>

            <div className="dash-input-wrapper mb-30">
              <label>Nome do imóvel*</label>
              <input
                type="text"
                placeholder="Ex.: Apartamento Centro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="row align-items-end">
              <div className="col-md-6">
                <div className="dash-input-wrapper mb-30">
                  <label>Tipo*</label>
                  <select
                    className="nice-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="Apartamento">Apartamento</option>
                    <option value="Casa">Casa</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Terreno">Terreno</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="dash-input-wrapper mb-30">
                  <label>Valor estimado</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex.: 450000"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="dash-input-wrapper mb-30">
                  <label>Área (m²)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex.: 85"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="dash-input-wrapper mb-30">
                  <label>Quartos</label>
                  <input
                    type="number"
                    min="0"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="dash-input-wrapper mb-30">
                  <label>Banheiros</label>
                  <input
                    type="number"
                    min="0"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white card-box border-20 mt-40">
            <h4 className="dash-title-three">Endereço</h4>

            <div className="dash-input-wrapper mb-30">
              <label>Endereço*</label>
              <input
                type="text"
                placeholder="Rua, número, complemento"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="row">
              <div className="col-md-8">
                <div className="dash-input-wrapper mb-30">
                  <label>Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex.: Campinas"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="dash-input-wrapper mb-30">
                  <label>Estado</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="mt-30">
              <p>{message}</p>
            </div>
          )}

          <div className="button-group d-inline-flex align-items-center mt-30">
            <button
              type="submit"
              className="dash-btn-two tran3s me-3"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar imóvel"}
            </button>

            <button
              type="button"
              className="dash-cancel-btn tran3s"
              onClick={() => router.push("/dashboard/properties-list")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPropertyBody;
