export const metadata = {
  title: "Política de Privacidade | Meu Patrimônio",
  description: "Política de Privacidade da plataforma Meu Patrimônio.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#f7f5f2",
      padding: "48px 20px",
      color: "#1d1d1f",
      fontFamily: "Arial, Helvetica, sans-serif"
    }}>
      <article style={{
        maxWidth: 900,
        margin: "0 auto",
        background: "#fff",
        borderRadius: 20,
        padding: "40px",
        boxShadow: "0 8px 30px rgba(0,0,0,.06)",
        lineHeight: 1.7
      }}>
        <header style={{marginBottom: 32}}>
          <div style={{fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "#666"}}>
            Meu Patrimônio
          </div>
          <h1 style={{fontSize: 36, margin: "8px 0 12px"}}>Política de Privacidade</h1>
          <p style={{margin: 0, color: "#666"}}>
            Última atualização: 15 de outubro de 2026.
          </p>
        </header>

        <p>
          Esta Política de Privacidade descreve como a plataforma <strong>Meu Patrimônio</strong>
          trata dados pessoais relacionados à administração de imóveis, contratos de locação,
          faturamento, documentos e comunicação com locatários.
        </p>

        <h2>1. Dados que podemos tratar</h2>
        <p>
          Podemos tratar dados cadastrais e de contato, como nome, CPF ou CNPJ, telefone,
          e-mail e endereço; dados relativos a imóveis e contratos de locação; informações
          financeiras necessárias à emissão, acompanhamento e conciliação de cobranças;
          documentos enviados ou armazenados na plataforma; e mensagens trocadas pelos canais
          de atendimento integrados ao sistema.
        </p>

        <h2>2. Finalidades do tratamento</h2>
        <p>
          Os dados são utilizados para administrar imóveis e contratos, identificar locatários
          e responsáveis, emitir e acompanhar faturas e cobranças, disponibilizar documentos,
          prestar atendimento, manter histórico de comunicações, cumprir obrigações legais e
          exercer direitos relacionados às relações contratuais.
        </p>

        <h2>3. WhatsApp</h2>
        <p>
          A plataforma pode utilizar a WhatsApp Business Platform para comunicação entre a
          imobiliária ou responsável pelo imóvel e seus locatários. Essas comunicações podem
          incluir atendimento, envio de faturas, boletos, comprovantes, avisos de vencimento,
          confirmações de pagamento e outras informações relacionadas à locação.
        </p>
        <p>
          Quando um usuário envia mensagem ao número comercial vinculado à plataforma, dados
          como número de telefone, nome de perfil, conteúdo da mensagem, anexos e informações
          de entrega ou leitura disponibilizadas pelo WhatsApp podem ser tratados para permitir
          o atendimento e manter o histórico da comunicação.
        </p>

        <h2>4. Pagamentos e Asaas</h2>
        <p>
          Para emissão e gestão de cobranças, a plataforma pode integrar-se ao Asaas. Nesse
          contexto, dados estritamente necessários à criação da cobrança e à conciliação do
          pagamento podem ser compartilhados com esse prestador. O processamento financeiro
          realizado pelo Asaas também está sujeito às políticas e condições próprias daquele
          serviço.
        </p>

        <h2>5. Armazenamento e segurança</h2>
        <p>
          Adotamos medidas técnicas e administrativas destinadas a proteger os dados contra
          acesso não autorizado, perda, alteração, divulgação ou tratamento inadequado.
          Documentos privados e informações de gestão são armazenados em ambientes com controles
          de acesso e segregação por usuário.
        </p>

        <h2>6. Compartilhamento de dados</h2>
        <p>
          Os dados podem ser compartilhados com prestadores utilizados para operar a plataforma,
          como serviços de infraestrutura, banco de dados, armazenamento, comunicação e
          processamento de pagamentos, sempre de acordo com a finalidade necessária à prestação
          do serviço. Também poderá haver compartilhamento quando exigido por lei, decisão
          judicial ou autoridade competente.
        </p>

        <h2>7. Retenção</h2>
        <p>
          Os dados serão mantidos pelo período necessário para as finalidades descritas nesta
          política, para o cumprimento de obrigações legais ou regulatórias e para o exercício
          regular de direitos relacionados aos contratos administrados.
        </p>

        <h2>8. Direitos do titular</h2>
        <p>
          Nos termos da Lei Geral de Proteção de Dados Pessoais (LGPD), o titular pode solicitar,
          quando aplicável, confirmação e acesso aos seus dados, correção de dados incompletos ou
          inexatos, informações sobre compartilhamento, eliminação ou anonimização nos casos
          previstos em lei e demais direitos assegurados pela legislação.
        </p>

        <h2>9. Exclusão e solicitações</h2>
        <p>
          Solicitações relacionadas a dados pessoais, incluindo pedidos de acesso, correção ou
          exclusão, podem ser encaminhadas diretamente ao responsável pela administração do
          imóvel ou da plataforma por meio dos canais de contato disponibilizados na relação de
          locação.
        </p>

        <h2>10. Alterações desta política</h2>
        <p>
          Esta política poderá ser atualizada para refletir mudanças legais, operacionais ou
          tecnológicas. A versão vigente permanecerá disponível publicamente nesta página.
        </p>

        <hr style={{border: 0, borderTop: "1px solid #eee", margin: "32px 0"}} />

        <p style={{fontSize: 14, color: "#666", marginBottom: 0}}>
          Esta página é destinada a informar os usuários sobre o tratamento de dados realizado
          pela plataforma Meu Patrimônio. Antes da operação comercial em larga escala, recomenda-se
          revisão jurídica da política e dos fluxos de tratamento de dados.
        </p>
      </article>
    </main>
  );
}
