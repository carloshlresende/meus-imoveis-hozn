"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

import OpenEye from "@/assets/images/icon/icon_68.svg";

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

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }

    toast.success("Login realizado com sucesso.");
    router.push("/dashboard/dashboard-index");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="row">
        <div className="col-12">
          <div className="input-group-meta position-relative mb-25">
            <label>E-mail*</label>
            <input
              type="email"
              {...register("email")}
              placeholder="seuemail@exemplo.com"
            />
            <p className="form_error">{errors.email?.message}</p>
          </div>
        </div>

        <div className="col-12">
          <div className="input-group-meta position-relative mb-20">
            <label>Senha*</label>
            <input
              type={isPasswordVisible ? "text" : "password"}
              {...register("password")}
              placeholder="Digite sua senha"
              className="pass_log_id"
            />

            <span className="placeholder_icon">
              <span
                className={`passVicon ${isPasswordVisible ? "eye-slash" : ""}`}
              >
                <Image
                  onClick={() => setPasswordVisibility(!isPasswordVisible)}
                  src={OpenEye}
                  alt=""
                />
              </span>
            </span>

            <p className="form_error">{errors.password?.message}</p>
          </div>
        </div>

        <div className="col-12">
          <div className="agreement-checkbox d-flex justify-content-between align-items-center">
            <div>
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Manter conectado</label>
            </div>

            <Link href="#">Esqueci minha senha</Link>
          </div>
        </div>

        <div className="col-12">
          <button
            type="submit"
            className="btn-two w-100 text-uppercase d-block mt-20"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default LoginForm;
