"use client"

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Wrapper from "@/layouts/Wrapper";
import DashboardHeaderTwo from "@/layouts/headers/dashboard/DashboardHeaderTwo";
import { createClient } from "@/lib/supabase/client";

type DocumentRow = {
  id: string;
  name: string;
  document_type: string | null;
  storage_path: string | null;
  created_at: string;
};

export default function PropertyDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const propertyId = params.id as string;

  const [propertyName, setPropertyName] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("Documento do imóvel");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [propertyResult, docsResult] = await Promise.all([
      supabase.from("properties").select("name").eq("id", propertyId).single(),
      supabase
        .from("documents")
        .select("id,name,document_type,storage_path,created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false }),
    ]);

    if (propertyResult.data) setPropertyName(propertyResult.data.name);
    if (docsResult.error) setMessage("Erro ao carregar documentos: " + docsResult.error.message);
    else setDocuments((docsResult.data as DocumentRow[]) ?? []);
  }

  useEffect(() => {
    loadData();
  }, [propertyId]);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("Selecione um arquivo.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMessage("Você precisa estar logado.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${user.id}/properties/${propertyId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("private-documents")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setSaving(false);
      setMessage("Erro no upload: " + uploadError.message);
      return;
    }

    const { error: dbError } = await supabase.from("documents").insert({
      user_id: user.id,
      property_id: propertyId,
      name: name.trim() || file.name,
      document_type: documentType,
      storage_path: path,
      file_url: null,
      is_private: true,
    });

    setSaving(false);

    if (dbError) {
      setMessage("Arquivo enviado, mas houve erro ao registrar: " + dbError.message);
      return;
    }

    setFile(null);
    setName("");
    setMessage("Documento armazenado com segurança.");
    await loadData();
  }

  async function openDocument(doc: DocumentRow) {
    if (!doc.storage_path) return;
    const { data, error } = await supabase.storage
      .from("private-documents")
      .createSignedUrl(doc.storage_path, 60);

    if (error || !data?.signedUrl) {
      alert("Não foi possível abrir o documento.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeDocument(doc: DocumentRow) {
    if (!window.confirm(`Excluir o documento "${doc.name}"?`)) return;

    if (doc.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("private-documents")
        .remove([doc.storage_path]);
      if (storageError) {
        alert("Erro ao excluir arquivo: " + storageError.message);
        return;
      }
    }

    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      alert("Erro ao excluir registro: " + error.message);
      return;
    }

    await loadData();
  }

  return (
    <Wrapper>
      <div className="dashboard-body">
        <div className="position-relative">
          <DashboardHeaderTwo title="Documentos do imóvel" />
          <h2 className="main-title d-block d-lg-none">Documentos do imóvel</h2>

          <div className="bg-white card-box border-20 mb-40">
            <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center">
              <div>
                <h4 className="dash-title-three mb-1">{propertyName || "Imóvel"}</h4>
                <p className="m0">Arquivos privados: contratos, matrícula, IPTU, laudos e outros documentos.</p>
              </div>
              <button className="btn btn-outline-dark" onClick={() => router.push(`/dashboard/edit-property/${propertyId}`)}>
                Voltar ao imóvel
              </button>
            </div>
          </div>

          <form onSubmit={upload}>
            <div className="bg-white card-box border-20 mb-40">
              <h4 className="dash-title-three">Adicionar documento</h4>
              <div className="row">
                <div className="col-md-4">
                  <div className="dash-input-wrapper mb-30">
                    <label>Nome</label>
                    <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex.: Matrícula atualizada" />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="dash-input-wrapper mb-30">
                    <label>Tipo</label>
                    <select className="nice-select" value={documentType} onChange={(e)=>setDocumentType(e.target.value)}>
                      <option>Documento do imóvel</option>
                      <option>Contrato assinado</option>
                      <option>IPTU</option>
                      <option>Matrícula</option>
                      <option>Laudo / vistoria</option>
                      <option>Documento pessoal</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="dash-input-wrapper mb-30">
                    <label>Arquivo*</label>
                    <input type="file" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} required />
                  </div>
                </div>
              </div>

              <button className="dash-btn-two tran3s" disabled={saving}>
                {saving ? "Enviando..." : "Armazenar documento"}
              </button>
              {message && <p className="mt-20">{message}</p>}
            </div>
          </form>

          <div className="bg-white card-box border-20">
            <div className="table-responsive">
              <table className="table property-list-table">
                <thead><tr><th>Documento</th><th>Tipo</th><th>Data</th><th>Ações</th></tr></thead>
                <tbody className="border-0">
                  {documents.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-5">Nenhum documento armazenado.</td></tr>
                  ) : documents.map((doc)=>(
                    <tr key={doc.id}>
                      <td><strong>{doc.name}</strong></td>
                      <td>{doc.document_type || "—"}</td>
                      <td>{new Date(doc.created_at).toLocaleDateString("pt-BR")}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-dark" onClick={()=>openDocument(doc)}>Abrir</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={()=>removeDocument(doc)}>Excluir</button>
                        </div>
                      </td>
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
