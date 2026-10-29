# Roteiro de apresentação — CampusFlow

Duração prevista: **7 minutos** (cabe entre 5 e 8). Cada bloco indica quem fala, o que dizer e o que fazer no celular.

## Antes de começar (checklist)

- [ ] `npm install` feito e `npx expo start` rodando; app aberto no Expo Go. Se a rede da sala bloquear, use `npx expo start --tunnel`.
- [ ] Tela do celular espelhada no projetor (Android: `scrcpy` pelo cabo USB; iOS: QuickTime no Mac ou espelhamento de tela).
- [ ] **No dia**, em Configurações → *Carregar dados de demonstração*, para que as datas fiquem atuais.
- [ ] Em Configurações: nome preenchido (a saudação usa o nome), **lembretes ativados** com a permissão já concedida e antecedência **"No horário"**.
- [ ] Modo "não perturbe" desligado; volume e brilho ajustados.

---

## 1. Problema, público e proposta (Integrante 1, ~1 min)

**Fala:** "Na faculdade, provas, trabalhos e listas ficam espalhados entre grupos de mensagem, anotações e várias plataformas. É fácil perder um prazo. O CampusFlow junta tudo em um app de celular que funciona sem internet: o estudante cadastra as disciplinas e as atividades, vê o que está atrasado e o que vence logo, acompanha o próprio progresso e recebe lembretes antes dos prazos. O público são estudantes universitários que querem organizar a rotina pelo celular."

**No celular:** mostrar a tela **Início**: saudação com o nome, cartão azul de progresso, contadores e a seção **Atrasadas** em vermelho.

**Mencionar a identidade visual:** azul profundo como cor principal, verde-limão só para o progresso, vermelho/âmbar/verde para atrasado/em breve/concluído, ícone próprio.

## 2. Navegação, listas e calendário (Integrante 2, ~1min30)

1. Tocar no contador **Atrasadas** do cartão: abre a aba **Atividades** já filtrada.
2. Mostrar os filtros de **status**, **prioridade** e **disciplina**, e o botão **Prazo ↑/↓** que inverte a ordenação. Comentar que o subtítulo diz quantas atividades e quais filtros estão ativos.
3. Ir para **Calendário**: dias com compromisso destacados, pontos coloridos por categoria (roxo = prova, azul = trabalho), ponto vermelho = atrasada. Trocar de mês com as setas e voltar com **Hoje**.
4. Tocar em um dia sem atividades e mostrar o estado vazio com **Adicionar neste dia**.

**Fala:** "Os filtros são consultas reais ao banco: cada toque refaz o `SELECT` com os parâmetros escolhidos."

## 3. CRUD e persistência no SQLite (Integrante 3, ~1min30)

1. Botão **Nova atividade** → tocar em **Criar atividade** com o título vazio: aparece a mensagem de validação no campo.
2. Preencher: título "Apresentação de Dispositivos Móveis", categoria **Trabalho**, prioridade **Alta**, prazo **daqui a 2 minutos** (seletor de hora). Salvar: o toast confirma e informa o horário do lembrete.
   > Esse lembrete vai chegar durante o bloco 4. Isso faz parte da demonstração.
3. Abrir a atividade criada → **Editar** → mudar o título → salvar. Comentar: "o registro é atualizado pelo id; não é criado outro".
4. Voltar à lista, **concluir** uma atividade pelo círculo e **reabrir**.
5. Menu **⋯** de outra atividade → **Excluir** → mostrar o diálogo de confirmação → confirmar.
6. **Persistência:** fechar o app completamente (remover dos recentes) e abrir de novo pelo Expo Go. Tudo continua lá.

**Fala:** "Os dados estão em um banco SQLite no próprio aparelho. Toda gravação passa por uma camada de serviço que salva no banco, ajusta o lembrete e avisa as telas para recarregarem."

## 4. Disciplinas, estatísticas e lembretes (Integrante 4, ~1min30)

1. **Disciplinas:** mostrar cor, professor e contagem. Menu ⋯ de "Banco de Dados" → **Excluir**: o app avisa quantas atividades estão vinculadas e pergunta se deve **mantê-las sem disciplina** ou **excluir tudo**. Escolher *Cancelar* (ou *Manter sem disciplina* e mostrar o efeito).
2. **Estatísticas:** taxa de conclusão, totais e barras por disciplina e categoria. Voltar à lista, concluir uma atividade e reabrir as Estatísticas: o número muda. **Os valores vêm de `COUNT`/`SUM` no SQLite, não são fixos.**
3. **Lembretes:** a notificação da atividade criada no bloco 3 deve chegar agora. Tocar nela abre os detalhes da atividade. Se ainda não chegou, usar Configurações → **Enviar notificação de teste** (chega em ~5 s).
4. Em Configurações, mostrar: antecedência do lembrete, estado da permissão, armazenamento local (arquivo, versão do SQLite, contagens) e **Apagar todos os dados** (mostrar o diálogo de confirmação e **cancelar**).

## 5. Arquitetura, decisões técnicas e testes (Integrante 5, ~1min30)

**Fala (pode mostrar o README ou a estrutura de pastas):**

- **Expo SDK 58 + React Native + TypeScript estrito**, rodando no Expo Go, sem build nativo.
- **Expo Router**: navegação por arquivos, com 5 abas e telas em pilha (formulários, detalhes, configurações). As **rotas são tipadas**: um link para tela inexistente nem compila.
- **Camadas:** telas → `useQuery` → repositórios (todo o SQL, sempre parametrizado) → SQLite; gravações passam por `services/actions`, que também cuida dos lembretes e avisa as telas.
- **Banco:** 3 tabelas, chave estrangeira com `ON DELETE SET NULL`, `CHECK` nos campos, nome de disciplina único, migração versionada por `PRAGMA user_version`.
- **Datas:** prazo salvo em horário local (`2026-11-05T19:00`), que ordena como texto. "Atrasada" é calculada na consulta, nunca fica desatualizada.
- **Notificações:** só locais, com identificador fixo por atividade (`activity-<id>`), o que permite cancelar ou reagendar sem guardar nada extra.
- **Testes:** 15 testes automatizados rodam o SQL real em SQLite; TypeScript, lint e `expo-doctor` sem erros; bundle Android/iOS compilado; teste de interface automatizado no navegador com 52 verificações. **Limitação declarada:** a validação final em celular segue o roteiro de `docs/TESTES.md`.

**Encerramento:** "O CampusFlow resolve um problema real do estudante, funciona offline, guarda tudo em SQLite com integridade garantida pelo próprio banco e foi construído e testado em camadas. Obrigado!"

---

## Perguntas que o professor pode fazer

**1. Por que SQLite e não AsyncStorage?**
Os dados são relacionais (disciplina 1:N atividades) e precisam de filtros, ordenação e agregações. Com SQLite isso é feito em SQL (`WHERE`, `ORDER BY`, `COUNT`/`SUM`), com chaves estrangeiras, restrições e transações. O AsyncStorage é só chave-valor: tudo teria de ser filtrado em memória.

**2. Como garantem a integridade entre disciplinas e atividades?**
`activities.subject_id` é chave estrangeira para `subjects(id)` com `ON DELETE SET NULL`, e `PRAGMA foreign_keys = ON` é executado a cada abertura (no SQLite essa opção vale por conexão). Inserir atividade com disciplina inexistente falha; há teste automatizado para isso.

**3. E ao excluir uma disciplina que tem atividades?**
O app conta as atividades vinculadas e pergunta: manter (o banco as deixa sem disciplina via `SET NULL`) ou excluir tudo (as atividades são apagadas na mesma transação, e os lembretes delas são cancelados).

**4. Como evitam SQL injection?**
Todos os valores vão como parâmetros (`?`) para `runAsync`/`getAllAsync`. A única parte montada dinamicamente é a lista de condições do `WHERE` e a direção do `ORDER BY`, escolhida de uma lista fixa (`ASC`/`DESC`), nunca a partir de texto do usuário (`src/repositories/activities.ts`).

**5. Como as telas se atualizam depois de uma alteração?**
As telas leem dados pelo hook `useQuery`. Toda gravação passa por `services/actions.ts`, que no fim chama `notifyDataChanged()`, e todas as consultas abertas são refeitas. Por isso Início, lista, calendário e estatísticas mostram o mesmo estado.

**6. Como o app sabe que uma atividade está atrasada? E o fuso horário?**
Atrasada = `status = 'pending' AND due_at < agora`. O prazo é gravado em horário local no formato `AAAA-MM-DDTHH:mm`, que ordena corretamente como texto, então a comparação é feita no SQL. Os testes rodaram em 6 fusos diferentes.

**7. Como funcionam as notificações no Expo Go? Há limitações?**
São notificações **locais** agendadas com `expo-notifications` (gatilho por data), e funcionam no Expo Go. O que o Expo Go não suporta é push remoto no Android, que o app não usa. No Expo Go a permissão pertence ao app Expo Go; no iOS há limite de 64 agendamentos; no Android, sem alarme exato, a entrega pode atrasar alguns minutos.

**8. E se o usuário negar a permissão?**
O app continua funcionando. O interruptor de lembretes não liga, aparece um aviso com atalho para os ajustes do sistema e o estado "negada" é exibido. A permissão só é pedida quando o usuário ativa os lembretes ou envia o teste.

**9. Como os lembretes acompanham edições e exclusões?**
Cada atividade tem um identificador de notificação fixo (`activity-<id>`). Ao salvar, o lembrete antigo é cancelado e um novo é agendado, só se a atividade estiver pendente e o horário do lembrete for futuro. Ao concluir ou excluir, ele é cancelado. Ao mudar a antecedência, todos são reagendados.

**10. Como os dados de demonstração evitam duplicação?**
As disciplinas são inseridas com `ON CONFLICT(name) DO NOTHING`, reaproveitando as existentes. As atividades de exemplo têm `is_demo = 1` e são recriadas dentro de uma transação, sem tocar nas atividades do usuário. Há teste automatizado que carrega duas vezes e confere os totais.

**11. Como as estatísticas são calculadas?**
Com consultas agregadas no SQLite: `COUNT(*)`, `SUM(status = 'done')`, `GROUP BY subject_id` e `GROUP BY category` (`src/repositories/stats.ts`). Nada é fixo no código; há teste comparando os números com o banco.

**12. Como validam os formulários?**
Em duas camadas: na interface (`src/utils/validation.ts`, mensagens claras no próprio campo) e no banco (`CHECK`, `NOT NULL`, `UNIQUE`), que é a garantia final mesmo se a interface falhar.

**13. E se o modelo de dados mudar em uma versão futura?**
A migração é versionada com `PRAGMA user_version`: basta acrescentar um bloco `if (version < 2) { ... }` em `src/database/schema.ts`. O banco do usuário é atualizado na abertura, sem perder dados.

**14. Por que Expo Router e não React Navigation direto?**
O Expo Router é a navegação recomendada pelo Expo, construída sobre o React Navigation. Ele organiza as telas por arquivos, permite abrir telas com parâmetros (a lista filtrada vem de outras telas pela URL) e gera rotas tipadas, que eliminam links quebrados.

**15. Como foi testado? Testaram no celular?**
Testes automatizados da camada de dados com SQLite real (15/15), TypeScript e lint sem erros, compilação dos bundles Android/iOS e um teste de interface automatizado no navegador com 52 verificações. O teste em celular segue o roteiro de `docs/TESTES.md` [preencher com o resultado da execução da equipe].

**16. E acessibilidade?**
Botões só com ícone têm rótulo para leitores de tela; cartões expõem as ações "concluir" e "mais ações"; estados (selecionado, marcado) são informados; áreas de toque têm pelo menos 44 pt; os pares de cores principais têm contraste mínimo de 4,5:1 (WCAG AA).
