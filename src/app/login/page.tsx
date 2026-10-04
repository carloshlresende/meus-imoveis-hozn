import LoginForm from "@/components/forms/LoginForm";
import Wrapper from "@/layouts/Wrapper";

export const metadata = {
  title: "Login | Meu Patrimônio",
};

export default function LoginPage() {
  return (
    <Wrapper>
      <main
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", background: "#f7f7f7", padding: "24px" }}
      >
        <div
          className="user-data-form bg-white"
          style={{ width: "100%", maxWidth: 520, borderRadius: 20, padding: 40 }}
        >
          <div className="form-wrapper m-auto">
            <div className="text-center mb-30">
              <h2>Meu Patrimônio</h2>
              <p className="fs-20 color-dark">
                Entre para gerenciar seus imóveis
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </main>
    </Wrapper>
  );
}
