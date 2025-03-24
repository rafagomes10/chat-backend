const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // URL do frontend Next.js
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Habilitar CORS para todas as rotas
app.use(cors());

// Rota básica para teste
app.get('/', (req, res) => {
  res.send('API do Chat está funcionando! :D')
});

// Lista de usuários conectados
const connectedUsers = new Map();

// Configuração do Socket.io
io.on('connection', (socket) => {
  console.log('Novo usuário conectado');

  // Quando um usuário se conecta
  socket.on('user-join', (username) => {
    // Armazenar o nome do usuário
    connectedUsers.set(socket.id, username);

    // Enviar mensagem de boas-vindas
    socket.emit('message', {
      user: 'Sistema',
      text: `Bem-vindo ao chat, ${username}!`,
      time: new Date().toLocaleTimeString()
    });

    // Notificar outros usuários
    socket.broadcast.emit('message', {
      user: 'Sistema',
      text: `${username} entrou no chat`,
      time: new Date().toLocaleTimeString()
    });

    // Atualizar lista de usuários para todos
    io.emit('update-users', Array.from(connectedUsers.values()));
  });

  // Quando um usuário envia uma mensagem
  socket.on('send-message', (message) => {
    const username = connectedUsers.get(socket.id);
    io.emit('message', {
      user: username,
      text: message,
      time: new Date().toLocaleTimeString()
    });
  });

  // Quando um usuário desconecta
  socket.on('disconnect', () => {
    const username = connectedUsers.get(socket.id);
    if (username) {
      console.log(`Usuário ${username} desconectado`);

      // Remover usuário da lista
      connectedUsers.delete(socket.id);

      // Notificar outros usuários
      socket.broadcast.emit('message', {
        user: 'Sistema',
        text: `${username} saiu do chat`,
        time: new Date().toLocaleTimeString()
      });

      // Atualizar lista de usuários para todos
      io.emit('update-users', Array.from(connectedUsers.values()));
    }
  });
});

const PORT = process.env.PORT || 4000; // Usando porta 4000 para o backend
server.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});