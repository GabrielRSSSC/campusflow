# Relatório de testes — CampusFlow

- **Data da execução:** 29/10/2026
- **Ambiente:** Linux (CachyOS), Node.js 26.12.1, npm 11.19.1, Expo SDK 58.0.21, React Native 0.88.1
- **Aparelhos:** nenhum celular físico ou emulador estava disponível no ambiente de desenvolvimento. Por isso, os testes em dispositivo estão listados como **pendentes** na seção 5.

## 1. Resumo

| # | Verificação | Como | Resultado |
| --- | --- | --- | --- |
| 1 | Camada de dados e utilitários | `npm test` (15 testes, SQL real) | ✅ 15/15, em 6 fusos horários |
| 2 | Tipos (strict) e rotas | `npm run typecheck` com rotas tipadas | ✅ 0 erros |
| 3 | Lint | `npm run lint` | ✅ 0 problemas |
| 4 | Dependências e configuração | `npx expo-doctor` | ✅ 20/20 |
| 5 | Compilação para Android e iOS | `npx expo export` (bytecode Hermes) | ✅ sem erros |
| 6 | Servidor do Expo Go | `npx expo start` + download do bundle | ✅ manifesto e bundle servidos |
| 7 | Fluxos de interface | Teste automatizado no navegador (seção 4) | ✅ 52/52 |
| 8 | Execução no celular com Expo Go | Roteiro manual (seção 5) | ⏳ pendente |

## 2. Testes automatizados (`npm test`)

**Estratégia.** A parte mais crítica do app é o banco: esquema, restrições, filtros, ordenação, estatísticas e carga de demonstração. Esses pontos são testados com o **mesmo SQL do app**, executado em um SQLite real (`node:sqlite`, em memória). O arquivo `tests/node-sqlite.ts` expõe esse banco com a mesma API assíncrona do `expo-sqlite` (`runAsync`, `getAllAsync`, `getFirstAsync`, `execAsync`, `withTransactionAsync`). Assim, os repositórios rodam sem nenhuma alteração. Os testes usam o executor nativo do Node (`node:test`) com `tsx` para TypeScript.

| Teste | O que verifica |
| --- | --- |
| migração | cria o esquema, é idempotente (reabrir não apaga dados), `user_version = 1`, chaves estrangeiras ativas e rejeição de disciplina inexistente |
| CRUD de atividades | criar, ler (com nome da disciplina), editar **mantendo o id**, concluir, reabrir, excluir, editar algo inexistente retorna `false` |
| filtros e ordenação | todas/pendentes/atrasadas/concluídas, prioridade, disciplina, "sem disciplina", filtros combinados, intervalo de datas, limite, ordem crescente e decrescente |
| indicadores | resumo (total, concluídas, pendentes, atrasadas, próximos 7 dias), por disciplina, por categoria e contagens por disciplina; banco vazio retorna zeros |
| exclusão de disciplina | opção "manter" deixa as atividades sem disciplina (`ON DELETE SET NULL`); opção "excluir tudo" remove as atividades |
| restrições | nome de disciplina único sem diferenciar maiúsculas; `CHECK` de cor, título vazio, categoria inválida e formato de data |
| dados de demonstração | não duplica ao repetir, reaproveita disciplina homônima do usuário, preserva atividade e professor do usuário, totais corretos |
| preferências | valores padrão, atualização parcial e "apagar dados" preserva preferências |
| datas locais | conversão texto ⇄ data, rejeição de datas inexistentes (30/02, 24:00) |
| atraso | considera status, data e horário (minuto exato) |
| descrição do prazo | "Hoje", "Amanhã", dia da semana, data, outro ano, "Atrasada há 40 min / 5 h / 2 dias", concluída |
| calendário | grade de 6 semanas começando no domingo, dia da semana do dia 1, meses de 28 e 31 dias |
| saudação | bom dia / boa tarde / boa noite |
| validação de atividade | título obrigatório, mínimo e máximo, descrição máxima, data inválida |
| validação de disciplina | nome obrigatório, professor máximo, cor inválida |

**Resultado (saída real):**

```
$ npm test
✔ migração cria o esquema, é idempotente e ativa as chaves estrangeiras
✔ CRUD de atividades: criar, ler, editar sem trocar o id, concluir, reabrir e excluir
✔ filtros por status, prioridade, disciplina e período, com ordenação por prazo
✔ indicadores e resumos são calculados a partir do banco
✔ excluir disciplina: manter as atividades sem disciplina ou excluí-las juntas
✔ restrições do banco rejeitam dados inválidos
✔ dados de demonstração não duplicam e preservam os dados do usuário
✔ preferências têm valores padrão e apagar dados preserva as preferências
✔ prazos em horário local: conversão de ida e volta e datas inválidas
✔ atraso considera status, data e horário
✔ descrição relativa do prazo
✔ grade do calendário tem 6 semanas começando no domingo
✔ saudação conforme o horário
✔ validação do formulário de atividade
✔ validação do formulário de disciplina
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

Como o app trabalha com horário local, a suíte também foi executada com `TZ=America/Sao_Paulo`, `America/New_York` (com mudança de horário de verão em novembro), `Europe/London`, `Asia/Kolkata`, `Pacific/Chatham` e `UTC`. Todas passaram com 15/15.

## 3. Verificações estáticas e de build

- **TypeScript (`npm run typecheck`):** 0 erros em modo `strict`. Com as rotas tipadas do Expo Router, todo link de navegação é conferido contra os arquivos de rota. Para provar isso, um arquivo temporário com `router.push('/rota-inexistente')` foi compilado e o TypeScript **rejeitou** a rota; o arquivo foi removido em seguida.
- **ESLint (`npm run lint`):** 0 problemas, com a configuração oficial do Expo 58, que inclui as regras novas do React (efeitos e refs).
- **`npx expo-doctor`:** 20/20. Na primeira execução, o doctor apontou o `expo-font` como dependência *peer* faltante do `@expo/vector-icons`; ele foi instalado com `npx expo install expo-font`.
- **`npx expo export --platform android --platform ios`:** gerou os dois bundles em bytecode Hermes (2,9 MB cada). Isso confirma que todos os módulos resolvem e compilam para o motor JavaScript do celular.
- **`npx expo start`:** o servidor respondeu `packager-status:running`; o manifesto lido pelo Expo Go trouxe `runtimeVersion: exposdk:58.0.0` e nome `CampusFlow`; o bundle de desenvolvimento do Android foi baixado com HTTP 200 (1442 módulos).

## 4. Teste de interface automatizado (navegador)

**Por quê.** Sem celular ou emulador, a forma de executar a interface de verdade foi rodar o app no navegador com react-native-web e dirigi-lo por script. Assim as telas, a navegação, o SQLite e as recargas são exercitados com cliques reais, e não apenas compilados.

**Como.** Em uma **cópia temporária, fora do repositório**: instalação do `react-native-web`, Metro configurado para o SQLite em WebAssembly e um pequeno proxy adicionando os cabeçalhos COOP/COEP exigidos pelo SQLite web. O app foi aberto no Chromium headless (Playwright), com viewport de celular 390×844, idioma pt-BR e fuso America/Sao_Paulo. Como o `Alert` não exibe nada no react-native-web, a cópia registrava cada diálogo e o script "tocava" no botão desejado. Nada disso foi adicionado ao projeto.

**Resultado: 52/52 verificações aprovadas.**

| Área | Verificações |
| --- | --- |
| Inicialização | banco criado na primeira abertura; estado vazio do Início |
| Dados de demonstração | carga pelo Início; progresso exibido = 33% (5 de 15), conferido com o banco |
| Atividades | lista com 15; filtros por status (atrasadas = 2), prioridade (alta = 6), disciplina (Cálculo II = 3), pendentes (10); ordenação crescente ⇄ decrescente; concluir pelo cartão atualiza a lista (10 → 9) |
| Calendário | mês atual; dia sem atividades mostra estado vazio; "Adicionar neste dia" abre o formulário com a data escolhida |
| Disciplinas, Estatísticas, Configurações | telas carregam com os dados |
| Perfil | salvar o nome mostra confirmação e a saudação passa a usar o nome |
| Formulário | título vazio mostra "Informe um título para a atividade."; criação com prioridade, data rápida e disciplina mostra toast |
| Detalhes | abrir, editar (título atualizado), concluir |
| Persistência | após recarregar a página, os dados e a edição continuam lá |
| Disciplinas | nome duplicado ("cálculo ii") é recusado com mensagem; criação; toque abre as atividades filtradas, com estado vazio |
| Exclusões | excluir atividade pede confirmação; menu da disciplina (Editar/Excluir); exclusão informa "3 atividades vinculadas" e oferece *Manter sem disciplina* ou *Excluir tudo*; as duas opções têm o efeito esperado no banco |
| Operações em lote | "Apagar todos os dados" pede confirmação explícita e zera os dados; carregar e **recriar** a demonstração não duplica (15 atividades, 0 disciplinas novas na segunda vez); o Início reflete o banco |

**Problemas encontrados por este teste e corrigidos no código:**

1. **Falha que derrubava o app:** `getLastNotificationResponse()` lança exceção onde a função não existe, e isso quebrava o layout das abas. A chamada agora fica protegida: sem esse recurso, o app segue funcionando, só não abre a atividade pelo lembrete.
2. O toast de confirmação cobria o botão flutuante; foi movido para o topo da tela.
3. Rótulos da barra de abas cortados: a fonte personalizada (11 px) era maior que o espaço do rótulo; voltou ao tamanho padrão.
4. Os nomes lidos por leitores de tela incluíam o caractere do ícone; botões, chips e abas receberam rótulo acessível explícito.
5. Texto "1 provas" no calendário; o plural foi corrigido.
6. Nos detalhes, o selo do prazo repetia a data; agora mostra informação relativa ("Em 7 dias").
7. Com a lista aberta a partir de uma disciplina, o chip selecionado podia ficar fora da área visível; o subtítulo passou a nomear os filtros ativos.

Também foi corrigido, durante a revisão de código, um defeito no `useQuery`: `undefined` e `null` geravam a mesma chave, e trocar o filtro entre "Todas" e "Sem disciplina" não recarregaria a lista. O teste no navegador exercita esse filtro.

**Limites deste teste (não substitui o celular):**
- react-native-web não é o React Native nativo; layout e fontes podem diferir.
- Notificações não existem na web: o app exibiu apenas avisos e continuou funcionando, mas agendamento e entrega **não** foram testados.
- Os seletores nativos de data e hora não foram abertos; as datas foram definidas pelos atalhos "Em 1 semana" e "Adicionar neste dia".
- Os diálogos nativos (`Alert`) foram simulados; a lógica de cada botão foi exercitada, não a aparência.
- Artefatos que só aparecem na web: rótulos das abas levemente cortados no Chromium do Linux (métrica da fonte substituta) e o aviso do React sobre `<button>` dentro de `<button>` (cartões tocáveis com botões internos, padrão válido no nativo).

## 5. Pendente: teste no celular com Expo Go

Roteiro para executar no aparelho (Android e, se possível, iOS). Marque cada item ao concluir.

| ID | Procedimento | Resultado esperado | Android | iOS |
| --- | --- | --- | --- | --- |
| C1 | `npx expo start` e ler o QR code no Expo Go | App abre na tela Início | ☐ | ☐ |
| C2 | Tocar em "Explorar com dados de exemplo" | Progresso 33%, 2 atrasadas em vermelho | ☐ | ☐ |
| C3 | Nova atividade → escolher data e hora no seletor nativo | Diálogo de data e depois de hora (Android); seletor compacto (iOS); valor aparece no campo | ☐ | ☐ |
| C4 | Salvar com título vazio | Mensagem no campo + aviso "Revise os campos destacados" | ☐ | ☐ |
| C5 | Editar, concluir pelo círculo, reabrir | Mesmo item atualizado; toast de confirmação | ☐ | ☐ |
| C6 | Menu ⋯ → Excluir | Diálogo nativo de confirmação; item removido | ☐ | ☐ |
| C7 | Fechar o app (remover dos recentes) e reabrir | Todos os dados continuam salvos | ☐ | ☐ |
| C8 | Excluir disciplina com atividades (as duas opções) | Diálogo com 3 botões; efeito correto na lista | ☐ | ☐ |
| C9 | Configurações → ativar lembretes | Pedido de permissão aparece só agora | ☐ | ☐ |
| C10 | Negar a permissão | Aviso com atalho "Abrir ajustes"; estado "negada"; app segue normal | ☐ | ☐ |
| C11 | "Enviar notificação de teste" | Notificação chega em ~5 s (com o app aberto também) | ☐ | ☐ |
| C12 | Antecedência "No horário" + atividade com prazo daqui a 2 min; deixar o app em segundo plano | Lembrete chega no horário (pode atrasar alguns minutos no Android sem alarme exato) | ☐ | ☐ |
| C13 | Tocar na notificação do lembrete | Abre os detalhes da atividade | ☐ | ☐ |
| C14 | Concluir uma atividade com lembrete agendado | Lembrete não chega mais | ☐ | ☐ |
| C15 | Digitar nos formulários | Teclado não cobre o campo em edição | ☐ | ☐ |
| C16 | Aparelho com entalhe / barra de gestos | Conteúdo dentro da área segura; abas e botão flutuante acessíveis | ☐ | ☐ |
| C17 | TalkBack / VoiceOver em um cartão | Lê título, prazo e prioridade; ações "Marcar como concluída" e "Mais ações" disponíveis | ☐ | ☐ |
| C18 | Tela pequena (~360 dp) e fonte do sistema ampliada | Sem textos cortados nas abas e nos cartões | ☐ | ☐ |

## 6. Observações e limitações conhecidas

- **Expo Go:** ao carregar o `expo-notifications`, o Expo Go escreve no terminal um aviso sobre push remoto, recurso que o app não usa. Na interface, o aviso foi silenciado.
- **Permissão no Expo Go:** pertence ao app Expo Go. Se foi negada antes para outro projeto, é preciso liberar nos ajustes do sistema.
- **Android:** sem a permissão de alarme exato, o sistema pode adiar a entrega do lembrete por alguns minutos.
- **iOS:** limite de 64 notificações locais agendadas por app; o CampusFlow reagenda as 60 mais próximas.
- **Web:** fora do escopo do projeto. Foi usada apenas como ferramenta de teste.
