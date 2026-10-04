# Adaptação do OpenProperty para Meu Patrimônio

## Objetivo
Usar o OpenProperty (MIT) como referência funcional para gestão de locações, mantendo:
- Hozn como interface/base Next.js
- Supabase como PostgreSQL + Auth + Storage

## Mapeamento funcional

| OpenProperty | Nosso sistema |
|---|---|
| properties | properties |
| units | units |
| tenants | tenants |
| leases | leases |
| lease_tenants | lease_tenants |
| rent_charges | rent_charges |
| payments | payments |
| work_orders | maintenance (será enriquecida depois) |
| vendors | futuro módulo de fornecedores |
| settings | futuro módulo de configurações de aluguel |

## Relações principais

```text
PROPERTY
  └── UNIT
       └── LEASE
            ├── PRIMARY TENANT
            ├── OTHER TENANTS
            └── RENT CHARGES
                 └── PAYMENTS
```

## Estratégia adotada

### Imóveis e unidades
O sistema já possuía `properties`. Foi criada `units` para permitir imóveis com uma ou várias unidades locáveis.

Para preservar o funcionamento atual:
- cada imóvel existente recebeu uma unidade chamada `Principal`;
- novos imóveis recebem automaticamente uma unidade `Principal`;
- no futuro, imóveis multifamiliares poderão cadastrar unidades adicionais.

### Locatários
A tabela `tenants` foi preservada e recebeu:
- date_of_birth
- emergency_contact
- employer
- monthly_income
- notes

Os campos já existentes de nome, e-mail, telefone e documento continuam válidos.

### Contratos
A tabela `leases` foi preservada e recebeu:
- unit_id
- deposit
- late_fee
- notes

Os campos existentes continuam sendo usados:
- tenant_id = locatário principal
- rent_amount = aluguel mensal
- due_day = dia de vencimento
- adjustment_index = índice de reajuste brasileiro

### Ocupantes adicionais
`lease_tenants` permite associar outros locatários ao mesmo contrato.

### Cobranças mensais
Foi criada `rent_charges`.

Cada linha representa uma obrigação mensal de um contrato, por exemplo:

```text
Contrato A
Período: 2026-10
Vencimento: 10/10/2026
Valor: R$ 2.000
Recebido: R$ 1.200
Status: partial
```

Status:
- open
- partial
- paid
- overdue
- waived

Há unicidade por `lease_id + period`, evitando gerar a mesma cobrança duas vezes.

### Pagamentos
A tabela `payments` existente foi mantida e enriquecida com:
- charge_id
- method
- reference
- notes

A lógica de pagamentos passa a usar `charge_id`.

Ao registrar, alterar ou remover um pagamento, o banco recalcula automaticamente:
- amount_paid
- status da cobrança

Exemplo:
```text
Cobrança = R$ 2.000
Pagamento 1 = R$ 1.200
Pagamento 2 = R$ 500
Total pago = R$ 1.700
Status = partial
Saldo = R$ 300
```

## Próxima implementação de interface
1. Locatários
2. Contratos
3. Geração de cobranças mensais
4. Registro de pagamentos
5. Dashboard financeiro
6. Manutenção adaptada do OpenProperty

## Referência
Modelo funcional baseado em:
- clawnify/OpenProperty
- licença MIT
