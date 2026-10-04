"use client"

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import Wrapper from "@/layouts/Wrapper";
import { createClient } from "@/lib/supabase/client";

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);
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
  const [status, setStatus] = useState("vacant");
  const [waterAccountNumber, setWaterAccountNumber] = useState("");
  const [electricityAccountNumber, setElectricityAccountNumber] = useState("");
  const [utilityTransferNotes, setUtilityTransferNotes] = useState("");

  useEffect(() => {
    async function loadProperty() {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setMessage("Não foi possível carregar este imóvel.");
        setLoading(false);
        return;
      }

      setName(data.name ?? "");
      setAddress(data.address ?? "");
      setCity(data.city ?? "");
      setState(data.state ?? "SP");
      setType(data.type ?? "Apartamento");
      setArea(data.area?.toString() ?? "");
      setBedrooms(data.bedrooms?.toString() ?? "");
      setBathrooms(data.bathrooms?.toString() ?? "");
      setEstimatedValue(data.estimated_value?.toString() ?? "");
      setStatus(data.status ?? "vacant");
      setWaterAccountNumber(data.water_account_number ?? "");
      setElectricityAccountNumber(data.electricity_account_number ?? "");
      setUtilityTransferNotes(data.utility_transfer_notes ?? "");
      setLoading(false);
    }

    loadProperty();
  }, [id]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("properties")
      .update({
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
        status,
        water_provider: "SABESP",
        water_account_number: waterAccountNumber.trim() || null,
        electricity_provider: "CPFL",
        electricity_account_number: electricityAccountNumber.trim() || null,
        utility_transfer_notes: utilityTransferNotes.trim() || null,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setMessage("Erro ao atualizar imóvel: " + error.message);
      return;
    }

    router.push("/dashboard/properties-list");
    router.refresh();
  }

  return (
    <Wrapper>
      <div className="dashboard-body">
        <div className="position-relative">
          <DashboardHeaderTwo title="Editar imóvel" />
          <h2 className="main-title d-block d-lg-none">Editar imóvel</h2>

          {loading ? (
            <div className="bg-white card-box border-20">
              Carregando imóvel...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="bg-white card-box border-20">
                <h4 className="dash-title-three">Dados do imóvel</h4>

                <div className="dash-input-wrapper mb-30">
                  <label>Nome do imóvel*</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Tipo</label>
                      <select
                        className="nice-select"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        <option>Apartamento</option>
                        <option>Casa</option>
                        <option>Comercial</option>
                        <option>Terreno</option>
                        <option>Outro</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Status</label>
                      <select
                        className="nice-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="vacant">Vago</option>
                        <option value="rented">Alugado</option>
                        <option value="maintenance">Manutenção</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="dash-input-wrapper mb-30">
                      <label>Área (m²)</label>
                      <input
                        type="number"
                        step="0.01"
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

                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Valor estimado</label>
                      <input
                        type="number"
                        step="0.01"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
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
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white card-box border-20 mt-40">
                <h4 className="dash-title-three">Água e energia</h4>
                <div className="row">
                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>RGI SABESP</label>
                      <input type="text" value={waterAccountNumber} onChange={(e)=>setWaterAccountNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="dash-input-wrapper mb-30">
                      <label>Instalação / UC CPFL</label>
                      <input type="text" value={electricityAccountNumber} onChange={(e)=>setElectricityAccountNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="dash-input-wrapper mb-30">
                      <label>Observações sobre transferência de titularidade</label>
                      <textarea className="size-lg" value={utilityTransferNotes} onChange={(e)=>setUtilityTransferNotes(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-30">
                <a className="dash-btn-two tran3s" href={`/dashboard/property-documents/${id}`}>
                  Documentos do imóvel
                </a>
              </div>

              {message && <p className="mt-30">{message}</p>}

              <div className="button-group d-inline-flex align-items-center mt-30">
                <button
                  type="submit"
                  className="dash-btn-two tran3s me-3"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
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
          )}
        </div>
      </div>
    </Wrapper>
  );
}
