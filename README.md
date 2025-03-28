# Chat Dashboard - Backend

Este é o backend de uma aplicação de chat em tempo real desenvolvida por Rafael Gomez.

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript server-side
- **Express**: Framework web para Node.js
- **Socket.io**: Biblioteca para comunicação em tempo real
- **CORS**: Middleware para habilitar Cross-Origin Resource Sharing
- **HTTP/HTTPS**: Módulos nativos do Node.js para criação de servidores

## Funcionalidades

- Comunicação em tempo real entre usuários
- Notificações de entrada e saída de usuários
- Histórico temporário de mensagens
- Lista de usuários conectados
- Prevenção de nomes de usuário duplicados
- Formatação de horário no padrão brasileiro
- Sistema de Jogo da Velha (TicTacToe)
- Sistema de convites para partidas
- Gerenciamento de jogos ativos
- Controle de jogadores em partida
- Tratamento de desconexões durante o jogo
- Auto-ping para manter o servidor ativo (especialmente para deploy no Render.com)

## Requisitos

- Node.js (versão 12 ou superior)
- npm (gerenciador de pacotes do Node.js)

### Instalação

1. Clone o repositório ou baixe os arquivos
2. Navegue até a pasta do backend
3. Instale as dependências:

```bash
cd /Users/rafaelgomez/Desktop/chatDashboard/BackEnd
npm install
```
## Como Executar

- Para iniciar o servidor em modo de desenvolvimento (com reinicialização automática):
1- npm run dev

- Para iniciar o servidor em modo de produção:

1- npm start

## Estrutura do Projeto

- server.js : Arquivo principal que configura o servidor Express e Socket.io.
- package.json : Arquivo de configuração do projeto com dependências e scripts.

## Autor
Desenvolvido por Rafael Gomez