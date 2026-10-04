"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { createClient } from "@/lib/supabase/client";

interface FormData {
  email: string;
  password: string;
}

const LoginForm = () => {
  const router = useRouter();
  const supabase = createClient();

  const schema = yup
    .object({
      email: yup.string().required("Informe seu e-mail").email("E-mail inválido"),
      password: yup.string().required("Informe sua senha"),
    })
    .required();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(schema) });

  const [isPasswordVisible, setPasswordVisibility] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setAuthMessage("");

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (error) {
        setAuthMessage(`Supabase: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!authData.session) {
        setAuthMessage("O login não criou uma sessão. Verifique o usuário no Supabase.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard/dashboard-index");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido ao entrar.";
      setAuthMessage(`Erro: ${message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-20">
        <label
          htmlFor="login-email"
          style={{ display: "block", marginBottom: 6, fontSize: 15 }}
        >
          E-mail
        </label>
        <input
          id="login-email"
          type="email"
          {...register("email")}
          placeholder="seuemail@exemplo.com"
          autoComplete="email"
          style={{
            width: "100%",
            height: 52,
            border: "1px solid #d9dedc",
            borderRadius: 8,
            padding: "0 16px",
            background: "#f7f8f8",
          }}
        />
        {errors.email?.message && (
          <p style={{ color: "#b42318", marginTop: 6 }}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="mb-20">
        <label
          htmlFor="login-password"
          style={{ display: "block", marginBottom: 6, fontSize: 15 }}
        >
          Senha
        </label>

        <div style={{ position: "relative" }}>
          <input
            id="login-password"
            type={isPasswordVisible ? "text" : "password"}
            {...register("password")}
            placeholder="Digite sua senha"
            autoComplete="current-password"
            style={{
              width: "100%",
              height: 52,
              border: "1px solid #d9dedc",
              borderRadius: 8,
              padding: "0 52px 0 16px",
              background: "#f7f8f8",
            }}
          />

          <button
            type="button"
            onClick={() => setPasswordVisibility(!isPasswordVisible)}
            aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {isPasswordVisible ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {errors.password?.message && (
          <p style={{ color: "#b42318", marginTop: 6 }}>
            {errors.password.message}
          </p>
        )}
      </div>

      {authMessage && (
        <div
          role="alert"
          style={{
            marginBottom: 18,
            padding: "12px 14px",
            border: "1px solid #f1b7b2",
            borderRadius: 8,
            background: "#fff4f2",
            color: "#8a1c13",
            fontSize: 14,
          }}
        >
          {authMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          height: 52,
          border: 0,
          borderRadius: 8,
          background: "#254035",
          color: "#fff",
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
};

export default LoginForm;
