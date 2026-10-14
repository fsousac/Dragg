# Roadmap: o que o Dragg pode ter (100% gratuito)

Comparativo com o Pierre (pierre.finance), restrito ao que dá para entregar **sem custo** para quem usa e para quem hospeda o Dragg.

## Como esta análise foi feita

- Landing pública (`lp.pierre.finance`) e páginas públicas do app web, lidas com REA (análise estática de scripts) e fetch.
- App web com sessão logada, em observação passiva: nomes de rotas, URLs de API e **formato** das respostas (nenhum valor de conta foi lido ou guardado).
- Fonte: marketing, imprensa e o bundle JS do próprio app.

Legenda de evidência: **[obs]** observado no app, **[inf]** inferido, **[?]** desconhecido.

## Restrição: tudo precisa ser gratuito

| Item                                             | Custo                                                       | Veredito                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| Pluggy API (Open Finance para apps de terceiros) | a partir de ~R$ 2.500/mês                                   | **fora**                                                                    |
| **Meu Pluggy** (uso pessoal)                     | grátis, até 5 conexões por titular, atualização a cada 24 h | **dentro**, com chaves de cada usuário                                      |
| Belvo, Tecnospeed                                | pagos                                                       | fora                                                                        |
| Stripe / planos pagos                            | taxas                                                       | fora (o Dragg não cobra)                                                    |
| LLM hospedado pago (chat dos agentes)            | por token                                                   | fora como padrão; só opcional, com chave do próprio usuário ou modelo local |
| Supabase e Vercel                                | plano gratuito                                              | dentro (já usados)                                                          |

Fontes: [Meu Pluggy](https://www.pluggy.ai/meu-pluggy), [preços Pluggy](https://www.pluggy.ai/pricing). Confirme os limites antes de implementar, pois podem ter mudado.

### Open Finance de graça: modelo "traga sua chave"

O Meu Pluggy é para o próprio titular. O Pluggy diz que quem constrói um app para outros usuários conectarem as contas deve usar a API paga. Por isso o Dragg **não** pode operar uma conta Pluggy central para todos. O desenho que respeita a regra:

1. Cada pessoa cria a própria conta no Meu Pluggy e gera o `CLIENT_ID` e o `CLIENT_SECRET` dela.
2. Cola as chaves em Configurações do Dragg (ou nas variáveis de ambiente, se hospeda para si).
3. O Dragg sincroniza apenas os dados dessa pessoa, com as chaves dela.

Consequências: nenhum custo para o projeto; as chaves são segredos do usuário e ficam criptografadas no servidor, nunca no cliente; o Dragg não vira intermediário financeiro. Vale revisar os termos do Meu Pluggy antes de lançar, porque um Dragg hospedado para muitas pessoas pode ser lido como "app de terceiros".

## Como o Pierre funciona (resumo)

- **[obs]** Next.js na Vercel. Conexão bancária via Pluggy (`itemId`, objetos de conta com `bankData` e `creditData`).
- **[obs]** Dashboard com páginas de transações, categorias, cartões, investimentos, empréstimos, recorrentes e assinaturas. Dados via Server Actions do Next.js.
- **[obs]** Sync manual limitado por cota diária por conexão.
- **[obs]** `/chat` como tela principal: histórico, stream de resposta, voto de feedback, sugestões personalizadas e contextuais, voz (transcrição e TTS), upload de arquivos.
- **[obs]** Tela de revisão de categorias. Cobrança por Stripe (web) e RevenueCat (app).
- **[inf]** Categorização por servidor com correção do usuário; agentes por LLM com ferramentas sobre os dados do usuário.
- **[?]** Modelo de LLM, prompts, regras dos agentes e formato exato de transações e categorias.

## O que o Dragg já tem

Login (Google e e-mail), dashboard mensal 50/30/20, transações com parcelas e assinaturas, categorias com limite, formas de pagamento, cartão com fechamento e vencimento, metas, relatórios e tabela LGPD.

## O que falta, em ordem

| #   | Funcionalidade                                | Equivalente no Pierre                        | Como fazer de graça                                                                                                                               | Esforço | Estado                                                                       |
| --- | --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| 1   | Importar extrato CSV/OFX                      | upload de arquivos **[obs]**                 | Parsers no navegador, sem dependência                                                                                                             | S       | **pronto**: `/transactions/import` (precisa da migration 008)                |
| 2   | Evitar duplicadas na importação               | detecção de cobranças duplicadas **[obs]**   | Chave estável (`id` do banco ou data + valor + descrição) e índice único                                                                          | S       | **pronto** (só entre linhas importadas; não compara com lançamentos manuais) |
| 3   | Categorização automática                      | categorização automática **[obs]**           | Aprende pelo histórico: descrição já categorizada reaproveita a categoria                                                                         | S       | **pronto** (`learnRules`); regras manuais ficam para depois                  |
| 4   | Tela de revisão de categorias                 | `/review-categories` **[obs]**               | Lista de transações sem categoria ou com regra fraca                                                                                              | S       | a fazer                                                                      |
| 5   | Alertas de limite de gasto                    | alerta ao passar do limite **[obs landing]** | Os limites já existem; calcular consumo e mostrar no app (sem e-mail/push no começo)                                                              | S       | a fazer                                                                      |
| 6   | Detecção de anomalias                         | cobranças suspeitas **[obs landing]**        | SQL: mesmo valor e comerciante em ±3 dias; valor acima de N desvios da média da categoria                                                         | M       | a fazer                                                                      |
| 7   | Recorrentes detectadas                        | `/dashboard/recurring` **[obs]**             | Agrupar por comerciante e periodicidade mensal                                                                                                    | M       | a fazer                                                                      |
| 8   | Lembretes de pagamento                        | lembretes **[obs landing]**                  | Vencimentos de fatura e assinaturas no dashboard; notificação opcional depois                                                                     | S       | a fazer                                                                      |
| 9   | Open Finance com chaves próprias (Meu Pluggy) | conexão de contas **[obs]**                  | Ver seção acima; tabelas `bank_connections` e `accounts`, sync diário por cron do Supabase                                                        | L       | a fazer                                                                      |
| 10  | Dados reais de cartão                         | `creditData` **[obs]**                       | Limite, vencimento e fatura vindos da Pluggy substituem as linhas planejadas                                                                      | M       | depende do 9                                                                 |
| 11  | Investimentos                                 | `/dashboard/investments` **[obs]**           | Início manual (tabela `holdings`); automático via Pluggy depois do 9                                                                              | M       | a fazer                                                                      |
| 12  | Assistente com chat                           | `/chat` **[obs]**                            | Perguntas fixas e consultas SQL sem IA primeiro; LLM só opcional, com chave do usuário ou modelo local; ferramentas só de leitura, sempre sob RLS | L       | a fazer                                                                      |
| 13  | Voz                                           | transcrição e TTS **[obs]**                  | Web Speech API do navegador (grátis)                                                                                                              | S       | opcional                                                                     |
| 14  | WhatsApp                                      | canal de uso **[obs landing]**               | A API oficial não é gratuita em escala                                                                                                            | —       | **fora**                                                                     |

Esforço: S = horas, M = dias, L = semanas.

## Fora do escopo (incompatível com gratuito)

- Planos pagos, Stripe e RevenueCat.
- Pierre One (cartão) e Pierre Invest (CDB): produtos regulados.
- WhatsApp oficial e agentes por LLM hospedado pelo projeto.
- Qualquer coisa que exija um contrato de agregador pago.

## Fases sugeridas

1. **Importação (1-4):** tela de upload, gravação com dedupe, regras e revisão. Entrega valor sem depender de terceiros.
2. **Inteligência local (5-8):** alertas, anomalias, recorrentes e lembretes, só com SQL e regras.
3. **Open Finance com chaves próprias (9-11).**
4. **Assistente (12-13),** com IA somente se for opcional e sem custo para o projeto.

## Segurança e privacidade

- Chaves de terceiros (Meu Pluggy) só no servidor, criptografadas, nunca expostas ao cliente.
- Toda leitura e escrita escopada ao usuário (RLS), como já é o padrão do Dragg.
- Importação: validar tamanho (limite de 5.000 linhas já aplicado nos parsers) e tipo do arquivo, e nunca interpretar o conteúdo como HTML.
- Registrar consentimento e permitir desconectar e apagar os dados importados (LGPD).
