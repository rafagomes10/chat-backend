// Armazenar jogos ativos
const activeGames = new Map();
// Armazenar jogadores atualmente em jogo
const playersInGame = new Set();

function getHorarioBrasilia() {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// Função para atualizar e transmitir jogadores em jogo
function updatePlayersInGame(io) {
  // Converter Set para Array para enviar via socket
  const activePlayers = Array.from(playersInGame);
  console.log('Players currently in game:', activePlayers);
  io.emit('players-in-game-update', activePlayers);
}

// Função para verificar se há um vencedor
function checkWinner(board) {
  // Combinações vencedoras (linhas, colunas e diagonais)
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
    [0, 4, 8], [2, 4, 6]             // diagonais
  ];

  // Verificar cada padrão de vitória
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    // Se as três posições têm o mesmo símbolo (X ou O) e não são null
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Retorna o símbolo do vencedor (X ou O)
    }
  }

  return null; // Sem vencedor
}

function setupTicTacToe(io, socket, connectedUsers, messages) {
  // Convite para jogo
  socket.on('invite-to-game', (opponent) => {
    const inviter = connectedUsers.get(socket.id);

    // Verificar se o convidador ou o oponente já estão em jogo
    if (playersInGame.has(inviter) || playersInGame.has(opponent)) {
      console.log(`Convite rejeitado: ${inviter} ou ${opponent} já está em jogo`);
      return;
    }

    // Encontrar o socket do oponente
    let opponentSocketId = null;
    for (const [id, user] of connectedUsers.entries()) {
      if (user === opponent) {
        opponentSocketId = id;
        break;
      }
    }

    if (opponentSocketId) {
      console.log(`${inviter} convidou ${opponent} para jogar`);
      io.to(opponentSocketId).emit('game-invitation', inviter);
    }
  });

  // Aceitar convite
  socket.on('accept-game', (inviter) => {
    const accepter = connectedUsers.get(socket.id);

    // Verificar se o convidador ou o aceitante já estão em jogo
    if (playersInGame.has(inviter) || playersInGame.has(accepter)) {
      console.log(`Aceitação rejeitada: ${inviter} ou ${accepter} já está em jogo`);
      return;
    }

    // Encontrar o socket do convidador
    let inviterSocketId = null;
    for (const [id, user] of connectedUsers.entries()) {
      if (user === inviter) {
        inviterSocketId = id;
        break;
      }
    }

    if (inviterSocketId) {
      console.log(`${accepter} aceitou o convite de ${inviter}`);

      // Adicionar ambos os jogadores à lista de jogadores em jogo
      playersInGame.add(inviter);
      playersInGame.add(accepter);

      // Atualizar todos os clientes sobre jogadores em jogo
      updatePlayersInGame(io);

      // Criar novo jogo
      const gameId = `${inviter}-${accepter}`;
      const gameState = {
        board: Array(9).fill(null),
        currentPlayer: inviter,
        players: {
          X: inviter,
          O: accepter
        },
        sockets: {
          [inviter]: inviterSocketId,
          [accepter]: socket.id
        }
      };

      activeGames.set(gameId, gameState);

      // Notificar ambos os jogadores
      io.to(inviterSocketId).emit('game-start', {
        board: gameState.board,
        currentPlayer: gameState.currentPlayer,
        opponent: accepter
      });

      io.to(socket.id).emit('game-start', {
        board: gameState.board,
        currentPlayer: gameState.currentPlayer,
        opponent: inviter
      });

      // Enviar mensagem para o chat sobre o início do jogo
      const gameStartMessage = {
        user: 'Sistema',
        text: `${inviter} e ${accepter} começaram uma partida de Jogo da Velha!`,
        time: getHorarioBrasilia()
      };

      messages.push(gameStartMessage);
      io.emit('message', gameStartMessage);
    }
  });

  // Responder ao evento update-players-in-game do cliente
  socket.on('update-players-in-game', () => {
    updatePlayersInGame(io);
  });

  // Fazer jogada
  socket.on('make-move', (position) => {
    const player = connectedUsers.get(socket.id);

    // Encontrar o jogo ativo deste jogador
    let playerGame = null;
    let gameId = null;

    for (const [id, game] of activeGames.entries()) {
      if (game.players.X === player || game.players.O === player) {
        playerGame = game;
        gameId = id;
        break;
      }
    }

    if (!playerGame || playerGame.currentPlayer !== player) {
      return;
    }

    // Verificar se a posição é válida
    if (position < 0 || position > 8 || playerGame.board[position] !== null) {
      return;
    }

    // Determinar símbolo do jogador (X ou O)
    const symbol = playerGame.players.X === player ? 'X' : 'O';

    // Atualizar tabuleiro
    playerGame.board[position] = symbol;

    // Verificar se há vencedor
    const winner = checkWinner(playerGame.board);
    const isBoardFull = playerGame.board.every(cell => cell !== null);

    if (winner || isBoardFull) {
      // Remover jogadores da lista de jogadores em jogo
      playersInGame.delete(playerGame.players.X);
      playersInGame.delete(playerGame.players.O);

      // Atualizar todos os clientes sobre jogadores em jogo
      updatePlayersInGame(io);

      // Remover jogo
      activeGames.delete(gameId);

      // Notificar jogadores sobre o resultado
      if (winner) {
        io.to(playerGame.sockets[playerGame.players.X]).emit('game-over', player === playerGame.players.X ? 'win' : 'lose');
        io.to(playerGame.sockets[playerGame.players.O]).emit('game-over', player === playerGame.players.O ? 'win' : 'lose');

        // Mensagem para o chat
        const gameOverMessage = {
          user: 'Sistema',
          text: `${player} venceu a partida de Jogo da Velha contra ${player === playerGame.players.X ? playerGame.players.O : playerGame.players.X}!`,
          time: getHorarioBrasilia()
        };

        messages.push(gameOverMessage);
        io.emit('message', gameOverMessage);
      } else {
        io.to(playerGame.sockets[playerGame.players.X]).emit('game-over', 'draw');
        io.to(playerGame.sockets[playerGame.players.O]).emit('game-over', 'draw');

        // Mensagem para o chat
        const gameOverMessage = {
          user: 'Sistema',
          text: `A partida de Jogo da Velha entre ${playerGame.players.X} e ${playerGame.players.O} terminou em empate!`,
          time: getHorarioBrasilia()
        };

        messages.push(gameOverMessage);
        io.emit('message', gameOverMessage);
      }
    } else {
      // Alternar jogador
      playerGame.currentPlayer = playerGame.currentPlayer === playerGame.players.X ? playerGame.players.O : playerGame.players.X;

      // Notificar jogadores sobre a atualização
      io.to(playerGame.sockets[playerGame.players.X]).emit('game-update', {
        board: playerGame.board,
        currentPlayer: playerGame.currentPlayer
      });

      io.to(playerGame.sockets[playerGame.players.O]).emit('game-update', {
        board: playerGame.board,
        currentPlayer: playerGame.currentPlayer
      });
    }
  });

  // Adicionar evento para quando o jogo termina no cliente
  socket.on('game-ended', () => {
    const player = connectedUsers.get(socket.id);

    // Verificar se o jogador está na lista de jogadores em jogo
    if (playersInGame.has(player)) {
      console.log(`Removendo ${player} da lista de jogadores em jogo após fim de partida`);
      playersInGame.delete(player);
      updatePlayersInGame(io);
    }
  });
}

// Função para lidar com a desconexão de um jogador
function handlePlayerDisconnect(io, socket, username, connectedUsers, messages, activeGames) {
  // Verificar se o usuário estava em algum jogo ativo
  for (const [gameId, game] of activeGames.entries()) {
    if (game.players.X === username || game.players.O === username) {
      const opponent = game.players.X === username ? game.players.O : game.players.X;

      // Remover ambos os jogadores da lista de jogadores em jogo
      playersInGame.delete(username);
      playersInGame.delete(opponent);

      // Atualizar todos os clientes sobre jogadores em jogo
      updatePlayersInGame(io);

      const opponentSocketId = game.sockets[opponent];

      // Notificar oponente que o jogo acabou
      io.to(opponentSocketId).emit('game-over', `${username} desconectou-se. Você venceu!`);

      // Enviar mensagem para o chat
      const gameOverMessage = {
        user: 'Sistema',
        text: `A partida de Jogo da Velha terminou porque ${username} desconectou-se. ${opponent} venceu!`,
        time: getHorarioBrasilia()
      };

      messages.push(gameOverMessage);
      io.emit('message', gameOverMessage);

      // Remover jogo
      activeGames.delete(gameId);
    }
  }

  // Remover o jogador da lista de jogadores em jogo (caso não tenha sido removido acima)
  if (playersInGame.has(username)) {
    playersInGame.delete(username);
    updatePlayersInGame(io);
  }
}

module.exports = {
  setupTicTacToe,
  handlePlayerDisconnect,
  activeGames,
  playersInGame
};