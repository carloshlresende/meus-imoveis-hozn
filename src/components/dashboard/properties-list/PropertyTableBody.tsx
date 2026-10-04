"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  type: string | null;
  estimated_value: number | null;
  status: string | null;
  created_at: string;
};

const money = (value: number | null) =>
  (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const statusLabel = (status: string | null) => {
  if (status === "vacant") return "Vago";
  if (status === "rented") return "Alugado";
  if (status === "maintenance") return "Manutenção";
  return status || "Sem status";
};

const PropertyTableBody = () => {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProperties() {
    setLoading(true);

    const { data, error } = await supabase
      .from("properties")
      .select("id,name,address,city,state,type,estimated_value,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setProperties([]);
    } else {
      setProperties(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProperties();
  }, []);

  if (loading) {
    return (
      <tbody className="border-0">
        <tr>
          <td colSpan={5} className="text-center py-5">
            Carregando imóveis...
          </td>
        </tr>
      </tbody>
    );
  }

  if (properties.length === 0) {
    return (
      <tbody className="border-0">
        <tr>
          <td colSpan={5} className="text-center py-5">
            Nenhum imóvel cadastrado ainda.
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="border-0">
      {properties.map((item) => (
        <tr key={item.id}>
          <td>
            <div className="position-relative">
              <div>
                <Link
                  href="#"
                  className="property-name tran3s color-dark fw-500 fs-20"
                >
                  {item.name}
                </Link>
                <div className="address">
                  {item.address}
                  {item.city ? ` · ${item.city}` : ""}
                  {item.state ? `/${item.state}` : ""}
                </div>
                <strong className="price color-dark">
                  {money(item.estimated_value)}
                </strong>
              </div>
            </div>
          </td>

          <td>{new Date(item.created_at).toLocaleDateString("pt-BR")}</td>
          <td>{item.type || "—"}</td>

          <td>
            <div
              className={`property-status ${
                item.status === "vacant" ? "pending" : ""
              }`}
            >
              {statusLabel(item.status)}
            </div>
          </td>

          <td>
            <div className="action-dots float-end">
              <button
                className="action-btn dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span></span>
              </button>

              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() =>
                      alert("Edição será adicionada na próxima etapa.")
                    }
                  >
                    Editar
                  </button>
                </li>
              </ul>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
};

export default PropertyTableBody;
