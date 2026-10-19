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
  const [postalCode, setPostalCode] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [garageSpaces, setGarageSpaces] = useState("");
  const [floor, setFloor] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [municipalRegistration, setMunicipalRegistration] = useState("");
  const [cib, setCib] = useState("");
  const [expectedRent, setExpectedRent] = useState("");
  const [condominium, setCondominium] = useState("");
  const [iptuMonthly, setIptuMonthly] = useState("");
  const [otherExpenses, setOtherExpenses] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [acquisitionCosts, setAcquisitionCosts] = useState("");
  const [currentValue, setCurrentValue] = useState("");

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
      setPostalCode(data.postal_code ?? "");
      setNumber(data.number ?? "");
      setComplement(data.complement ?? "");
      setNeighborhood(data.neighborhood ?? "");
      setGarageSpaces(data.garage_spaces?.toString() ?? "");
      setFloor(data.floor ?? "");
      setRegistrationNumber(data.registration_number ?? "");
      setMunicipalRegistration(data.municipal_registration ?? "");
      setCib(data.cib ?? "");
      setExpectedRent(data.expected_rent?.toString() ?? "");
      setCondominium(data.condominium?.toString() ?? "");
      setIptuMonthly(data.iptu_monthly?.toString() ?? "");
      setOtherExpenses(data.other_expenses?.toString() ?? "");
      setDescription(data.description ?? "");
      setNotes(data.notes ?? "");
      setAcquisitionDate(data.acquisition_date ?? "");
      setPurchasePrice(data.purchase_price?.toString() ?? "");
      setAcquisitionCosts(data.acquisition_costs?.toString() ?? "");
      setCurrentValue(data.current_value?.toString() ?? "");
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
        postal_code: postalCode.trim() || null,
        number: number.trim() || null,
        complement: complement.trim() || null,
        neighborhood: neighborhood.trim() || null,
        garage_spaces: garageSpaces ? Number(garageSpaces) : null,
        floor: floor.trim() || null,
        registration_number: registrationNumber.trim() || null,
        municipal_registration: municipalRegistration.trim() || null,
        cib: cib.trim() || null,
        expected_rent: expectedRent ? Number(expectedRent.replace(",", ".")) : null,
        condominium: condominium ? Number(condominium.replace(",", ".")) : null,
        iptu_monthly: iptuMonthly ? Number(iptuMonthly.replace(",", ".")) : null,
        other_expenses: otherExpenses ? Number(otherExpenses.replace(",", ".")) : null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        acquisition_date: acquisitionDate || null,
        purchase_price: purchasePrice ? Number(purchasePrice.replace(",", ".")) : null,
        acquisition_costs: acquisitionCosts ? Number(acquisitionCosts.replace(",", ".")) : null,
        current_value: currentValue ? Number(currentValue.replace(",", ".")) : null,
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
                <h4 className="dash-title-three">Cadastro patrimonial e locação</h4>
                <div className="row">
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>CEP</label><input value={postalCode} onChange={(e)=>setPostalCode(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Número</label><input value={number} onChange={(e)=>setNumber(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Bairro</label><input value={neighborhood} onChange={(e)=>setNeighborhood(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Complemento</label><input value={complement} onChange={(e)=>setComplement(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Vagas</label><input type="number" min="0" value={garageSpaces} onChange={(e)=>setGarageSpaces(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Andar</label><input value={floor} onChange={(e)=>setFloor(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Matrícula</label><input value={registrationNumber} onChange={(e)=>setRegistrationNumber(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Inscrição municipal</label><input value={municipalRegistration} onChange={(e)=>setMunicipalRegistration(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>CIB</label><input value={cib} onChange={(e)=>setCib(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Aluguel esperado</label><input type="number" step="0.01" value={expectedRent} onChange={(e)=>setExpectedRent(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Condomínio</label><input type="number" step="0.01" value={condominium} onChange={(e)=>setCondominium(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>IPTU mensal</label><input type="number" step="0.01" value={iptuMonthly} onChange={(e)=>setIptuMonthly(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Outras despesas</label><input type="number" step="0.01" value={otherExpenses} onChange={(e)=>setOtherExpenses(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Data de aquisição</label><input type="date" value={acquisitionDate} onChange={(e)=>setAcquisitionDate(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Preço de compra</label><input type="number" step="0.01" value={purchasePrice} onChange={(e)=>setPurchasePrice(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Custos de aquisição</label><input type="number" step="0.01" value={acquisitionCosts} onChange={(e)=>setAcquisitionCosts(e.target.value)} /></div></div>
                  <div className="col-md-3"><div className="dash-input-wrapper mb-30"><label>Valor atual</label><input type="number" step="0.01" value={currentValue} onChange={(e)=>setCurrentValue(e.target.value)} /></div></div>
                  <div className="col-12"><div className="dash-input-wrapper mb-30"><label>Descrição contratual do imóvel</label><textarea className="size-lg" value={description} onChange={(e)=>setDescription(e.target.value)} /></div></div>
                  <div className="col-12"><div className="dash-input-wrapper mb-30"><label>Notas internas</label><textarea className="size-lg" value={notes} onChange={(e)=>setNotes(e.target.value)} /></div></div>
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
