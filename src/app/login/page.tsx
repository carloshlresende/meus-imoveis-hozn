import LoginForm from "@/components/forms/LoginForm";
import Wrapper from "@/layouts/Wrapper";

export const metadata = {
  title: "Login | Meu Patrimônio",
};

export default function LoginPage() {
  return (
    <Wrapper>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f5f4",
          padding: 24,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 460,
            background: "#fff",
            borderRadius: 20,
            padding: "40px 36px",
            boxShadow: "0 18px 50px rgba(0,0,0,.08)",
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "inline-flex",
                width: 42,
                height: 42,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                background: "#254035",
                color: "#fff",
                fontWeight: 700,
                marginBottom: 18,
              }}
            >
              M
            </div>

            <h1 style={{ margin: 0, fontSize: 30, color: "#17221d" }}>
              Meu Patrimônio
            </h1>
            <p style={{ margin: "8px 0 0", color: "#65716b" }}>
              Entre para gerenciar seus imóveis.
            </p>
          </div>

          <LoginForm />
        </section>
      </main>
    </Wrapper>
  );
}
