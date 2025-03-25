const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://chatfrontend-rg.vercel.app", // URL do frontend Next.js
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Habilitar CORS para todas as rotas
app.use(cors());

// Rota básica para teste
app.get('/', (req, res) => {
  res.send('API do Chat está funcionando! Desenvolvido por: Rafael Gomez! :D version: 1.0.4')
});

// Lista de usuários conectados
const connectedUsers = new Map();
// Lista de mensagens (para manter histórico temporário)
const messages = [];

// Função para obter o horário de Brasília
function getHorarioBrasilia() {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
}

// Configuração do Socket.io
io.on('connection', (socket) => {
  console.log('Novo usuário conectado');

  // Quando um usuário se conecta
  socket.on('user-join', (username) => {
    // Armazenar o nome do usuário
    connectedUsers.set(socket.id, username);

    // Mensagem de boas-vindas
    const welcomeMessage = {
      user: 'Sistema',
      text: `Bem-vindo ao chat, ${username}!`,
      time: getHorarioBrasilia()
    };
    
    // Adicionar à lista de mensagens
    messages.push(welcomeMessage);
    
    // Enviar mensagem de boas-vindas
    socket.emit('message', welcomeMessage);
    
    // Enviar histórico de mensagens para o novo usuário
    socket.emit('message-history', messages);

    // Notificar outros usuários
    const joinMessage = {
      user: 'Sistema',
      text: `${username} entrou no chat`,
      time: getHorarioBrasilia()
    };
    
    messages.push(joinMessage);
    socket.broadcast.emit('message', joinMessage);

    // Atualizar lista de usuários para todos
    io.emit('update-users', Array.from(connectedUsers.values()));
  });

  // Quando um usuário envia uma mensagem
  socket.on('send-message', (message) => {
    const username = connectedUsers.get(socket.id);
    const newMessage = {
      user: username,
      text: message,
      time: getHorarioBrasilia()
    };
    
    // Adicionar à lista de mensagens
    messages.push(newMessage);
    
    // Enviar para todos
    io.emit('message', newMessage);
  });

  // Quando um usuário desconecta
  socket.on('disconnect', () => {
    const username = connectedUsers.get(socket.id);
    if (username) {
      console.log(`Usuário ${username} desconectado`);

      // Remover usuário da lista
      connectedUsers.delete(socket.id);
      
      // Remover mensagens do usuário que saiu
      const userMessageIndexes = [];
      messages.forEach((msg, index) => {
        if (msg.user === username) {
          userMessageIndexes.unshift(index); // Adiciona no início para remover de trás para frente
        }
      });
      
      userMessageIndexes.forEach(index => {
        messages.splice(index, 1);
      });

      // Notificar outros usuários
      const leaveMessage = {
        user: 'Sistema',
        text: `${username} saiu do chat`,
        time: getHorarioBrasilia()
      };
      
      messages.push(leaveMessage);
      socket.broadcast.emit('message', leaveMessage);

      // Atualizar lista de usuários para todos
      io.emit('update-users', Array.from(connectedUsers.values()));
      
      // Enviar histórico atualizado de mensagens (sem as mensagens do usuário que saiu)
      io.emit('message-history', messages);
    }
  });
});

const PORT = process.env.PORT || 4000; // Usando porta 4000 para o backend
server.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});