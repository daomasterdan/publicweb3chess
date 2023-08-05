// A couple global variables so that the submit button works
let resultGameId;
let resultColour;
let isBlack = "w";
let resultIpfs = "for testing purposed is me";
let myWallet = "GUEST";
let mySocket;
let gameDone = true;
const waitingPlayers = [];
const activeGames = {};
let playerColor;
let isMyTurn;
let playerName;

// Focus traps for modals
let traps = new Map();

// Button and Modal Setup
buttonSetup();

// Create chess board interactions
const chess = new Chess();
const chessboard = document.querySelector(".chessboard");
chessboard.addEventListener("drop", (e) => {
  e.preventDefault();
  draggingLayer.innerHTML = "";
});

// Initially disable the find match button
placeBetButton.disabled = true;

// Call init here
init();

let chessGameContractInstance = null;

// Define game state at the top level
let gameState = {
  currentGameId: null,
  currentAccount: null,
  player1Socket: null,
  stage: 'connected',
};

// Drag handling
const draggingLayer = document.createElement("div");
draggingLayer.classList.add("dragging-layer");
document.body.appendChild(draggingLayer);

// Call the function to update the colors initially
openTabByName('wagering');

// Socket connections and handling
let ws = new WebSocket('wss://chess3.xyz:443');
let walletToSocketMap = new Map();
setupWebSocketListeners(ws);

// Toggle theme
let userStyle = 'theme1'; // This should be 'style1' or 'style2', based on user's selection

updateBoardColors();
renderBoard();

//////////////////////////////////// End of procedure code //////////////////////////////////////

ws.onerror = function(event) {
  console.log('WebSocket error: ', event);
};

function addSocket(walletAddress, socket) {
  walletToSocketMap.set(walletAddress, socket);
}

function findSocketByAddress(walletAddress) {
  return walletToSocketMap.get(walletAddress);
}

ws.addEventListener('close', () => {
  console.log('WebSocket closed for wallet', ws.walletAddress);
});

//Assume ws is your WebSocket connection
ws.onmessage = function(event) {
  console.log("Error checking PlayerJoinedQueue Listener");
   // Parse the event data into a JSON object
   const eventData = JSON.parse(event.data);

   // Check the type of the event
   switch (eventData.type) {
     case 'PlayerJoinedQueue':
       handlePlayerJoinedQueue(eventData);
       break;
    case 'PlayerLeftQueue':
       handlePlayerLeftQueue(eventData);
      break;
     case 'GameStarted':
       handleGameStarted(eventData);
       break;
    default:
      console.log('Received unknown event type:', eventData.type);
   }
}

// Listener for set color
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'set_color') {
    openTabByName('main');
    gameDone = false;
    showNotification('Connected successfully! You are playing as ' + (message.color === 'w' ? 'White' : 'Black') + '.');
    if (message.color === 'b'){
      isBlack = "b";
      renderBoard();
    } else {
      isBlack = "w";
      renderBoard();
    }
  }
  if (message.type === 'match') {
    const opponentID = message.opponentID;
    // Start the match and handle game logic\

    // Call joinGameAndPlaceBet() function to join the game and place a bet
    joinGameAndPlaceBet().catch((error) => {
    console.error('Error joining game and placing bet:', error);
  });
  }
};

// Find match free queue
async function findMatch()  {
  chess.reset();
  renderBoard();
  findMatchButton.disabled = true;
  placeBetButton.disabled = true;
  findMatchButton.textContent = 'Searching for match...';
  let userWalletAddress = "GUEST";
  if (connectWalletButton.disabled == true) {
    // Non guest user is "logged in", grab their wallet address
    if (window.ethereum) {
      try {
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
          userWalletAddress = accounts[0];
        }
      }   catch (error) {
    console.error(`Error connecting to wallet: ${error.message}`);
    }
  }
}

  const message = { type: 'find_match', walletAddress: userWalletAddress };
  ws.send(JSON.stringify(message));
}

document.getElementById('toggleButton').addEventListener('change', function() {
  // Toggle the userStyle variable
  userStyle = (userStyle === 'theme1') ? 'theme2' : 'theme1';

  // Update the board and pieces
  updateBoardColors();
  renderBoard();

  // Implement your toggle logic here. For example:
  if(this.checked) {
    console.log('Toggle On');
  } else {
    console.log('Toggle Off');
  }
});

function pieceToImage(piece, position) {
  const pieces = {
    'theme1': {
      'w': {
        'p': 'white_pawn.png',
        'r': 'white_rook.png',
        'n': 'white_knight.png',
        'b': 'white_bishop.png',
        'q': 'white_queen.png',
        'k': 'white_king.png'
      },
      'b': {
        'p': 'black_pawn.png',
        'r': 'black_rook.png',
        'n': 'black_knight.png',
        'b': 'black_bishop.png',
        'q': 'black_queen.png',
        'k': 'black_king.png'
      }
    },
    'theme2': {
      'w': {
        'p': 'Green_Pawn.png',
        'r': 'Green_Rook.png',
        'n': 'Green_Knight.png',
        'b': 'Green_Bishop.png',
        'q': 'Green_Queen.png',
        'k': 'Green_King.png'
      },
      'b': {
        'p': 'Purple_Pawn.png',
        'r': 'Purple_Rook.png',
        'n': 'Purple_Knight.png',
        'b': 'Purple_Bishop.png',
        'q': 'Purple_Queen.png',
        'k': 'Purple_King.png'
      }
    }
  };

  if (pieces[userStyle] && pieces[userStyle][piece.color] && pieces[userStyle][piece.color][piece.type]) {
    const pieceImage = document.createElement('img');
    pieceImage.src = 'images/' + pieces[userStyle][piece.color][piece.type];
    pieceImage.classList.add('piece');
    pieceImage.draggable = true;
    return pieceImage;
  } else {
    console.error(`No image found for style: ${userStyle}, color: ${piece.color}, type: ${piece.type}`);
  }

  const pieceImage = document.createElement('img');
  pieceImage.src = 'images/' + pieces[userStyle][piece.color][piece.type];
  pieceImage.classList.add('piece');
  pieceImage.draggable = true;

  pieceImage.ondragstart = function (event) {
    event.dataTransfer.setData('text/plain', position);
    event.dataTransfer.setDragImage(new Image(), 0, 0);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    this.style.opacity = '0'; // make the original piece invisible
  };

  pieceImage.ondragend = function (event) {
    this.style.opacity = '1'; // make the original piece visible again
  };

  return pieceImage;
}

function updateBoardColors() {
  // Get all squares
  let squares = document.querySelectorAll('.cell');

  // Loop through each square
  squares.forEach(square => {
    // Remove any previous theme class
    square.classList.remove('light', 'dark');

    // Determine if the square is light or dark
    const color = (square.className.includes('light') ? 'light' : 'dark');

    // Add the selected theme class
    square.classList.add(color, userStyle);
  });
}

// Update the connect wallet button
function updateConnectWalletButton(address) {
    myWallet = address;
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    connectWalletButton.textContent = shortAddress;
    connectWalletButton.classList.add('connected-wallet');
    connectWalletButton.disabled = true;

    const greenCircle = document.createElement('span');
    greenCircle.className = 'green-circle';
    connectWalletButton.prepend(greenCircle);
}

// Handle a PlayerJoinedQueue event
function handlePlayerJoinedQueue(eventData) {
  // eventData should contain the address of the player and their wager amount
  console.log('Player', eventData.playerAddress, 'joined the queue with a wager of', eventData.wager, 'wei');
}

// Handle a PlayerLeftQueue event
function handlePlayerLeftQueue(eventData) {
  // eventData should contain the address of the player
  console.log('Player', eventData.playerAddress, 'left the queue');
}

function handleGameStarted(eventData) {
  // eventData should contain the gameId and the addresses of the two players
  console.log('Game', eventData.gameId, 'started between', eventData.player1, 'and', eventData.player2);
  console.log("Do we even make it here?");
  console.log("Do we even make it here?");

  // Update the game state
  gameState.currentGameId = eventData.gameId;

  // Find the corresponding websockets based on their stored wallet addresses
  const player1Socket = findSocketByAddress(eventData.player1);
  const player2Socket = findSocketByAddress(eventData.player2);

  if (!player1Socket || !player2Socket) {
    console.error('Could not find socket for one or both players');
    return;
  }

  // Update the game state
  gameState.player1Socket = player1Socket;

  // Add the game to the activeGames object
  activeGames[eventData.gameId] = { player1Socket, player2Socket };

  // Notify players
  console.log("Do we even make it here?");
  player1Socket.send(JSON.stringify({ type: 'game_start', gameId: eventData.gameId }));
  player2Socket.send(JSON.stringify({ type: 'game_start', gameId: eventData.gameId }));
  ws.send(JSON.stringify({ type: 'game_start', gameId: eventData.gameId }));
}

// Set up web socket listeners
function setupWebSocketListeners(ws) {
  ws.addEventListener('open', () => {
    console.log('Connected to WebSocket server');
    console.log(ws);
  });

  ws.addEventListener('message', (event) => {
    console.log('Received message:', event.data);
    console.log('before message');
    let data = JSON.parse(event.data);
    let message;
    console.log(resultGameId);
    console.log(resultColour);
    console.log('after message');
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      console.error('Could not parse message as JSON:', event.data);
      return;
    }
    console.log('after parse attemtp');
  
    if (message.type === 'move') {
      console.log(chess.in_check);
      chess.move({ from: message.from, to: message.to, promotion: message.promotion });
      renderBoard();
      document.querySelector(`[data-position="${message.from}"]`).classList.add('previous-move');
      document.querySelector(`[data-position="${message.to}"]`).classList.add('previous-move');
      isMyTurn = !isMyTurn;
      updateMoveHistory();
      // Check if game is in check or game over
      if (chess.in_check()) {
        if (chess.game_over()) {
          console.log("loser");
          gameDone = true;
          showModal(modal);
        } else if (chess.in_check()) {
          console.log(chess.game_over());
        console.log("It entered check tab in thge move tab");
        messageBox.textContent += `, ${chess.turn() === 'w' ? 'White' : 'Black'} is in check`;
        // Find the king's square and change its color to red
        const kingSquare = findKingsSquare(chess.turn());
        document.querySelector(`[data-position="${kingSquare}"]`).classList.add('in-check');
      }
    }
    } else if (data.type === 'resigned') {
      gameDone = true;
      ws.send(JSON.stringify({ type: 'game_won_count', usertag: loginButton.textContent }));
      if (placeBetButton.textContent == 'Connection Successful'){
        showModal(submitModal);
      }
      showModal(modal);
      // TODO run functions to declare this user as winner
    } else if (data.type === 'drawRequest') {
      // TODO handle draw request, add data containing true or false for yes or no
      showModal(drawRequestModal); 
    } else if (data.type === 'drawResponse') {
      // TODO handle draw response
      if (data.response == 'true'){
        closeModal(waitingForRequest);
        closeModal(drawModal);
        gameDone = true;
        // TODO draw game
        drawEndGame();
      } else {
        closeModal(waitingForRequest);
        closeModal(drawModal);
      }

    } else if (data.type === 'signup_response') {
      if (data.success) {
        console.log('Signup successful: ' + data.message);
        alert("Sign up Succesful!\n" + data.message);
        closeModal(signupModal);
        // Handle successful signup, e.g., transition to the game
      } else {
        console.error('Signup failed: ' + data.message);
        alert("Sign up Unsuccesful error:\n" + data.message);
        // Handle failed signup, e.g., show an error message to the user
      }
    } else if (data.type === 'login_response') {
      if (data.success === true){
        // Logged in succesfully
        loginButton.textContent = data.usertag;
        playerName = data.usertag;
        closeModal(loginModal);
        alert("Login succesful:\n" + data.message);
      } else if (data.success === false) {
        alert("Wrong username or password");
      }
      console.log(data);
    } else if (message.type === 'set_color') {
      gameDone = false;
      chess.reset();
      ws.send(JSON.stringify({ type: 'game_played_count', usertag: loginButton.textContent }));
      document.getElementById("resign").style.display = "inline";
      document.getElementById("draw").style.display = "inline";
      playerColor = message.color;
      console.log(playerColor);
      if (playerColor === 'w'){
        resultColour = 1;
      } else {
        resultColour = 2;
      }
      isMyTurn = playerColor === 'w';
      const opponentWalletAddress = message.walletAddress;
      document.getElementById('player1-wallet').textContent = myWallet;
      document.getElementById('player2-wallet').textContent = opponentWalletAddress;

      // Update the find match button and show a notification
      if (findMatchButton.textContent == 'Searching for match...'){
        updateFindMatchButton('Connection Successful');
      } else if (placeBetButton == 'Searching for match...'){
        // TODO turn this into a function maybe
        placeBetButton.textContent = 'Connection Successful';
      }


      showNotification('Connected successfully! You are playing as ' + (playerColor === 'w' ? 'White' : 'Black') + '.');
      openTabByName('main');

    } else if (message.type === 'match') {
      const opponentID = message.opponentID;
      // Start the match and handle game logic
    } else if (data.type === 'access_code_response') {
      if (data.accessGranted) {
        // The code is correct, show the main content
        document.getElementById("landing-page").style.display = "none";
        document.getElementById("bottom-content").style.display = "none";
        document.getElementById("main-content").style.display = "block";
        document.getElementById("footer-container").style.display = "block";
        connectWalletButton.style.display = "block";
        loginButton.style.display = "block";
        signUpButton.style.display = "block";
      } else {
        // The code is incorrect, show an error
        alert("Incorrect code");
      }
    } else if (data.type === 'private_join_attempt') {
      // If the received message type is 'private_join_attempt', emit a custom event
      const game_id_sc = message.game_id_sc;
      console.log(game_id_sc);
      resultGameId = game_id_sc;
      console.log(message);
      ws.dispatchEvent(new CustomEvent('private_join_attempt', { detail: game_id_sc }));
    } else if (data.type === 'GAME_CREATED') {
      createPrivateMatchButton.textContent = data.gameCode;
    } else if (data.type === 'FREE_GAME_CREATED') {
      createFreePrivateMatchButton.textContent = data.gameCode;
    } else if (data.type === 'signup_response') {
      closeModal(signupModal);
    }
  });

  ws.addEventListener('close', () => {
    console.log('Disconnected from WebSocket server');
  });

  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

// Change the state of find match button (This is a bad function)
function updateFindMatchButton(text) {
  findMatchButton.textContent = text;
  findMatchButton.disabled = true;
  placeBetButton.disabled = true;
}

// Majorly useful
function updateMoveHistory() {
  const history = chess.history({ verbose: true });
  let formattedHistory = '';

  const tempChess = new Chess();
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const piece = move.piece.charAt(0).toUpperCase() + move.piece.slice(1);
    let moveText = `${move.color === 'w' ? 'White' : 'Black'}'s ${piece} moves to ${move.to}`;

    if (move.captured) {
      moveText += `, captures ${move.color === 'w' ? 'black' : 'white'}'s ${move.captured} <br>`;
    }

    tempChess.move(move);

    const check = tempChess.in_check();
    const checkmate = tempChess.in_checkmate();
    const draw = tempChess.in_draw();

    moveText += (check ? ' (Check)' : '') + (checkmate ? ' (Checkmate)' : '') + (draw ? ' (Draw)' : '');

    formattedHistory += moveText;
  }

  //gameMoves.innerHTML = formattedHistory;
  document.getElementById("game-move-data").textContent = formattedHistory;
}

// Makes a move
function makeMove(from, to, promotion) {
  if (!isMyTurn) {
    return;
  }

  let move = { from: from, to: to };
  if (promotion) {
    move.promotion = promotion;
  } else {
    const piece = chess.get(from);
    if (!piece) {
      console.log(from);
      console.log('No piece exists at the specified location');
      return; // Exit the function if no piece exists
    }
    if (piece.type === 'p' && (to[1] === '1' || to[1] === '8')) {
      // Show the promotion dialog instead of the prompt
      document.getElementById('promotion-dialogue').style.display = 'block';

      // Add event listeners to the promotion options
      document.querySelectorAll('.promotion-option').forEach(function(option) {
        option.addEventListener('click', function() {
          // Update the move object with the selected promotion
          move.promotion = this.dataset.piece;
          
          // Hide the dialog
          document.getElementById('promotion-dialogue').style.display = 'none';

          // Perform the move with the selected promotion
          const result = chess.move(move);
          handleMoveResult(result, from, to, move.promotion);
        });
      });

      return;
    }
  }

  const result = chess.move(move);
  handleMoveResult(result, from, to, promotion);
}


function handleMoveResult(result, from, to, promotion) {
  if (!gameDone){
  if (result) {
    messageBox.textContent = `${result.color === 'w' ? 'White' : 'Black'} moved from ${result.from} to ${result.to}`;
    if (result.captured) {
      messageBox.textContent += `, captured ${result.color === 'w' ? 'black' : 'white'}'s ${result.captured}`;
    }

    renderBoard();

    // Remove the class from any cells that currently have it
    document.querySelectorAll('.previous-move').forEach(function(cell) {
      cell.classList.remove('previous-move');
    });

    // Add the class to the cells that were part of the move
    document.querySelector(`[data-position="${from}"]`).classList.add('previous-move');
    document.querySelector(`[data-position="${to}"]`).classList.add('previous-move');

    if (chess.in_checkmate()) {
      messageBox.textContent = `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`;
      ws.send(JSON.stringify({ type: 'game_won_count', usertag: loginButton.textContent }));
      console.log("winner");
      gameDone = true;
      if (placeBetButton.textContent == "Connection Successful" || createPrivateMatchButton.textContent != "Create Match"){
        showModal(submitModal);
      }
      showModal(modal);
    } else if (chess.in_draw()) {
      messageBox.textContent = 'Draw!';
      if (placeBetButton.textContent == "Connection Successful" || createPrivateMatchButton.textContent != "Create Match"){
        showModal(submitModal);
      }
      showModal(modal);
      gameDone = true;
    } else if (chess.in_check()) {
      messageBox.textContent += `, ${chess.turn() === 'w' ? 'White' : 'Black'} is in check`;
      // Find the king's square and change its color to red
      const kingSquare = findKingsSquare(chess.turn());
      document.querySelector(`[data-position="${kingSquare}"]`).classList.add('in-check');
    } else {
      messageBox.textContent += `. It's ${chess.turn() === 'w' ? 'White' : 'Black'}'s turn to move.`;
    }

    const message = { type: 'move', from: from, to: to, promotion: promotion };
    ws.send(JSON.stringify(message));

    isMyTurn = !isMyTurn;
  } else {  // move was unsuccessful
    const piece = chess.get(from);
    if (piece) {
      piece.element.style.visibility = "visible";  // show the original piece
    }
  }
  updateMoveHistory();
}
}

// Helper function to find the king's square
function findKingsSquare(color) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  for (let i = 1; i <= 8; i++) {
    for (const file of files) {
      const square = file + i;
      const piece = chess.get(square);
      if (piece && piece.type === 'k' && piece.color === color) {
        return square;
      }
    }
  }
  return null;
}

// Connect wallet
async function connectWallet() {
  if (window.ethereum) {
    try {
      web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        walletAddress = accounts[0];
        console.log(`Connected to ${accounts[0]}`);
        updateConnectWalletButton(accounts[0]);
        ws.send(JSON.stringify({ type: 'connect_wallet', walletAddress: walletAddress }));  
        addSocket(accounts[0], ws);

        // Enable the place bet button after connecting the wallet
        if (findMatchButton.disabled == false){
          placeBetButton.disabled = false;
        }
      } else {
        console.error('No accounts found');
      }
    } catch (error) {
      console.error(`Error connecting to wallet: ${error.message}`);
    }
  } else {
    console.error('No Ethereum browser extension detected');
  }
}

// Message to show notification
function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.innerHTML = message;
  notification.style.display = 'block';
}

// Get info from bet slider - This might be useless
function updateBetAmount() {
  var betSlider = document.getElementById("bet-slider");
  var betAmount = document.getElementById("bet-amount");
  betAmount.value = betSlider.value;
}

// Open a tab by its name
function openTabByName(tabName) {
  var i, tabContent, tabButtons;

  tabContent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabContent.length; i++) {
      tabContent[i].style.display = "none";
  }

  tabButtons = document.getElementsByClassName("tab-button");
  for (i = 0; i < tabButtons.length; i++) {
      tabButtons[i].classList.remove("active");
  }

  document.getElementById(tabName).style.display = "block";
  document.querySelector(`.tab-button[onclick="openTab(event, '${tabName}')"]`).classList.add("active");
}

function trapFocus(element) {
  let focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let firstFocusableElement = element.querySelectorAll(focusableElements)[0]; 
  let focusableContent = element.querySelectorAll(focusableElements);
  let lastFocusableElement = focusableContent[focusableContent.length - 1]; 

  function trap(e) {
      let isTabPressed = e.key === 'Tab' || e.keyCode === 9;

      if (!isTabPressed) {
          return;
      }

      if (e.shiftKey) { 
          if (document.activeElement === firstFocusableElement) {
              lastFocusableElement.focus(); 
              e.preventDefault();
          }
      } else {
          if (document.activeElement === lastFocusableElement) { 
              firstFocusableElement.focus(); 
              e.preventDefault();
          }
      }
  }

  element.addEventListener('keydown', trap);

  return {
      remove: function() {
          element.removeEventListener('keydown', trap);
      },
      focusFirst: function() {
          firstFocusableElement.focus();
      }
  }
}

// Function to show modal
function showModal(modalType) {
  modalType.style.display = "block";
  let trap = trapFocus(modalType);
  trap.focusFirst();
  traps.set(modalType, trap);
}

// Function to close a modal
function closeModal(modal) {
  modal.style.display = 'none';
  let trap = traps.get(modal);
  if (trap) {
      trap.remove();
      traps.delete(modal);
  }
}

// Create a private game
async function createPrivateGame(opponentWalletAddress) {
  chess.reset();
  renderBoard();
  const web3 = new Web3(window.ethereum);
  const accounts = await ethereum.request({ method: 'eth_accounts' });
  const currentAccount = accounts[0];
  const betAmountEther = 0.0001;
  const betAmountWei = web3.utils.toWei(betAmountEther.toString(), 'ether');

  // Create a contract instance
  const contract = new web3.eth.Contract(contractABI, ABIcontract);
  
  await listenForGameStarted(contract);

  // Call the contract function to create a private game
  console.log('Calling contract function createPrivateGame...');
  const gasEstimate = await contract.methods.startPrivateGame(opponentWalletAddress).estimateGas({ from: currentAccount, value: betAmountWei });
  console.log(`Estimated gas: ${gasEstimate}`);
  const result = await contract.methods.startPrivateGame(opponentWalletAddress).send({ from: currentAccount, value: betAmountWei, gas: gasEstimate });
  console.log('createPrivateGame function called, result:', result);
  
  

  // Now we need to share this gameId with the opponent, which could be done in many ways.
  // For simplicity, we'll just log it to the console for now.
  console.log(`Private game created with ID: ${resultGameId}. Share this ID with your opponent.`);

  // TODO send message declaring 'mySocket' as open socket connection? wait for other connection? send message to
  // serverside to create open game for other player to join? 
  // TODO check if join private game hears the gamestart ping, might have to give code in sol
  // so that the second player is notified properly, also how to connect the two users
  // into the same game instance :(
  console.log(mySocket);
  console.log("resultgameid" + resultGameId);
  mySocket.send(JSON.stringify({ type: 'private_match_create', walletAddress: myWallet, gameId: resultGameId, socket: mySocket }));
}

// Join a private game
async function joinPrivateGame(gameId) {
  chess.reset();
  renderBoard();
  const web3 = new Web3(window.ethereum);
  const accounts = await ethereum.request({ method: 'eth_accounts' });
  const currentAccount = accounts[0];
  const betAmountEther = 0.0001;
  const betAmountWei = web3.utils.toWei(betAmountEther.toString(), 'ether');

  // Create a contract instance
  const contract = new web3.eth.Contract(contractABI, ABIcontract);
  listenForGameStarted(contract);
  
  // Call the contract function to join the private game
  console.log('Calling contract function joinPrivateGame...');
  const gasEstimate = await contract.methods.acceptGame(gameId).estimateGas({ from: currentAccount, value: betAmountWei });
  console.log(`Estimated gas: ${gasEstimate}`);
  const result = await contract.methods.acceptGame(gameId).send({ from: currentAccount, value: betAmountWei, gas: gasEstimate });
  console.log('joinPrivateGame function called, result:', result);

  // Make connection to waiting socket i guess?
  // Potentially make a list of waiting private sockets, so that
  // accept games can message these sockets?

  mySocket.send(JSON.stringify({ type: 'private_match_accept', walletAddress: myWallet, gameId: gameId , socket: mySocket}));
  
}

// Listen for GameStarted event
async function listenForGameStarted(contract) {
  console.log("It made it inside the fucntion listen for game started");
  contract.events.GameStarted()
    .on('data', (event) => {
      console.log("It heard the game started event");
      console.log(`Game started event fired. Player1: ${event.returnValues.player1}, Player2: ${event.returnValues.player2}`);

      // Extract the players' addresses and game ID from the event data
      const player1Address = event.returnValues.player1;
      const player2Address = event.returnValues.player2;
      const gameId = event.returnValues.gameId;
      resultGameId = gameId;
      console.log(`${gameId}, ${player1Address}, ${player2Address}`);
      //console.log(`${currentAccount}`);
      
      // Update the game state
      gameState.currentGameId = gameId;
      gameState.currentAccount = myWallet; // Update with currentAccount instead of player1Address
      
      // Find the corresponding websockets based on their stored wallet addresses
      console.log(`Looking for WebSockets for Player1 and Player2. Current map:`, walletToSocketMap);
      const player1Socket = findSocketByAddress(player1Address);
      const player2Socket = findSocketByAddress(player2Address);
      console.log(`${player1Socket}`);
      console.log(`${player2Socket}`);

      // Assign the correct socket to gameState
      if (currentAccount === player1Address && player1Socket) {
        gameState.player1Socket = player1Socket;
      } else if (currentAccount === player2Address && player2Socket) {
        gameState.player1Socket = player2Socket;
      }

      // Add the game to the activeGames object
      activeGames[gameId] = { player1Socket: gameState.player1Socket, player2Socket: findSocketByAddress(player2Address) };
      console.log(`Added game to active games object:`, activeGames);

      // Send the 'set_color' messages to the players
      if (player1Socket) {
        player1Socket.send(JSON.stringify({ type: 'set_color', color: 'w', walletAddress: player1Address, gameId: gameId }));
        resultColour = 1;
        isBlack = "w";
        renderBoard();
      }
      if (player2Socket) {
        player2Socket.send(JSON.stringify({ type: 'set_color', color: 'b', walletAddress: player2Address, gameId: gameId }));
        resultColour = 2;
        isBlack = "b";
        renderBoard();
      }

      // Enable the game start button once game has started
      document.getElementById('start-game-button').disabled = false;
    })
    .on('error', console.error);
}

// this is a very basic password check for access
function checkPassword() {
  const code = document.getElementById("password-input").value;
  ws.send(JSON.stringify({ type: 'check_access_code', code: code }));
}

async function createGame(walletAddress) {
  // TODO call contract method create private, wait for response (listen for emitted event) to get smart contract game id
  // then send game id through the message
  let game_id_sc;
  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(contractABI, ABIcontract);
  const betAmountEther = 0.0001;
  const betAmountWei = web3.utils.toWei(betAmountEther.toString(), 'ether');
  createPrivateMatchButton.textContent = "Waiting for wallet..."
  const gasEstimate = await contract.methods.startPrivateGame().estimateGas({ from: walletAddress, value: betAmountWei });
  console.log(`Estimated gas: ${gasEstimate}`);

  // Get the receipt from the transaction
  const receipt = await contract.methods.startPrivateGame().send({ from: walletAddress, value: betAmountWei, gas: gasEstimate });
  console.log(receipt);

  // The receipt's 'events' property contains an object for each type of event that was emitted during the transaction
  // Each event object has a 'returnValues' property that includes the values emitted with the event
  if (receipt.events.PrivateGameCreated) {
    game_id_sc = receipt.events.PrivateGameCreated.returnValues.gameId;
  }

  console.log("This is the game id" + game_id_sc);
  resultGameId = game_id_sc;
  ws.send(JSON.stringify({ type: "private_create", game_id: game_id_sc }));
}

async function createFreeGame() {
  // TODO call contract method create private, wait for response (listen for emitted event) to get smart contract game id
  // then send game id through the message
  let game_id_sc = Math.random().toString(36).substring(2, 9);
  resultGameId = game_id_sc;
  ws.send(JSON.stringify({ type: "free_private_create", game_id: game_id_sc }));
}

function joinGame_attempt(gameCode) {
  ws.send(JSON.stringify({ type: "private_join_attempt", gameCode: gameCode }));

  return new Promise((resolve, reject) => {
    // This function will now return a Promise that resolves when a 'private_join_attempt' event is received

    const listener = (event) => {
      // Once the event is received, resolve the Promise with the game_id_sc
      resolve(event.detail);
      console.log(event.detail);
      console.log(event);

      // Remove the event listener once we've received the expected message
      ws.removeEventListener('private_join_attempt', listener);
    };

    ws.addEventListener('private_join_attempt', listener);

    // You can also add a timeout to reject the Promise if the event isn't received within a certain time period
    setTimeout(() => {
      ws.removeEventListener('private_join_attempt', listener);
      reject(new Error('Timeout waiting for private_join_attempt message'));
    }, 5000);
  });
}

function joinGame(gameCode) {
  ws.send(JSON.stringify({ type: "private_join", gameCode: gameCode }));
}

function joinFreeGame(gameCode) {
  ws.send(JSON.stringify({ type: "free_private_join", gameCode: gameCode }));
}

function doResign() {
  // TODO  this user is loser and send a message to other player declaring them winner and ending game
  gameDone = true;
  showModal(modal);
  closeModal(resignModal);
  ws.send(JSON.stringify({ type: "resigned" }));
}

function doDraw() {
  // TODO send message to other player prompting a draw, do nothing until response
  // If yes then draw game, if no then do nothing
  ws.send(JSON.stringify({ type: 'drawRequest'}));
  showModal(waitingForRequest); // TODO create modal
  closeModal(resignModal);
  // Wait for response, maybe new message listener for draw response?
}

function doLogin() {
  if (gameDone){
    showModal(loginModal);
  } else if (!gameDone) {
    alert("Please finish your current game before logging in");
  }
}

function doSignUp() {
  if (gameDone){
    showModal(signupModal);
  } else if (!gameDone) {
    alert("Please finish your current game before signing up");
  }
}
function drawEndGame() {
  console.log("Game has been drawn");
  console.log(findMatchButton.textContent);
  if(placeBetButton.textContent!= "Connection Successful" || createPrivateMatchButton.textContent != "Create Match"){
    console.log("Detected wager match");
    resultColour = 0;
    showModal(submitModal);
  }
  showModal(modal);
}

function drawResponse(response) {
  closeModal(waitingForRequest);
  closeModal(drawRequestModal);
  if(response) {
    // TODO Response was true, this user now pays for submit if wager
    gameDone = true;
    showModal(modal);
    ws.send(JSON.stringify({ type: 'drawResponse', response: 'true'}))
  }  
  else {
    // Response was false
    ws.send(JSON.stringify({ type: 'drawResponse', response: 'false'}))
  }
}

function buttonSetup() {
// Click listeners for buttons (these stay in scripts to make it easier for now)
loginButton.addEventListener('click', () => doLogin());
signUpButton.addEventListener('click', () => doSignUp());
resignButton.addEventListener('click', () => showModal(resignModal));
resignYes.addEventListener('click', () => doResign());
resignNo.addEventListener('click', () => closeModal(resignModal));
drawButton.addEventListener('click', () => showModal(drawModal));
drawYes.addEventListener('click', () => doDraw());
drawNo.addEventListener('click', () => closeModal(drawModal));
RdrawYes.addEventListener('click', () => drawResponse(true));
RdrawNo.addEventListener('click', () => drawResponse(false));

signupCloseButton.addEventListener('click', () => closeModal(signupModal));
loginCloseButton.addEventListener('click', () => closeModal(loginModal));
closeButton.addEventListener('click', () => closeModal(accessListModal));

// Add event listeners for confirm buttons
signupConfirmButton.addEventListener('click', () => {
  // Get input field values
  let email = document.getElementById('signup-email').value;
  let usertag = document.getElementById('signup-usertag').value;
  let wallet = document.getElementById('signup-wallet').value;
  let password = document.getElementById('signup-password').value;

  if (email == ""){
    email = null;
  }
  if (usertag == ""){
    usertag = null;
  }
  if (wallet == ""){
    wallet = null;
  }
  if (password == ""){
    password = null;
  }

  // Send data to the server
  ws.send(JSON.stringify({
    type: 'signup',
    email: email,
    usertag: usertag,
    wallet: wallet,
    password: password
  }))
});

loginConfirmButton.addEventListener('click', () => {
  // Get input field values
  const usertag = document.getElementById('login-usertag').value;
  const password = document.getElementById('login-password').value;
    
    // Send data to the server
    ws.send(JSON.stringify({
      type: 'login',
      usertag: usertag,
      password: password
    }))
  });
// Event listener for game retention
document.addEventListener('DOMContentLoaded', (event) => {
  endGamePopup();
});

function endGamePopup () {  
  // When the user clicks on Yes, hide the modal and join the queue again
  yesButton.onclick = function() {
    document.getElementById("resign").style.display = "none";
    document.getElementById("draw").style.display = "none";
    modal.style.display = "none";
    openTabByName('wagering');
    // Join the queue again, send user back to find game tab
    if (findMatchButton.textContent == "Connection Successful"){
      // placeBetButton.disabled = false;
      findMatchButton.disabled = true;
      placeBetButton.textContent = 'Join Queue';
      findMatchButton.textContent = 'Join Queue';
      findMatch();
    } else if (placeBetButton.textContent == "Connection Successful") { // Join wager queue
      placeBetButton.disabled = false;
      findMatchButton.disabled = true;
      placeBetButton.textContent = 'Join Queue';
      findMatchButton.textContent = 'Join Queue';
      joinWagerQueue();
    }
    else {
      if (connectWalletButton.disabled == true){
        placeBetButton.disabled = false;
        placeBetButton.textContent = 'Join Queue';
      }
      findMatchButton.disabled = false;
      findMatchButton.textContent = 'Join Queue';
      createPrivateMatchButton.textContent = "Create Match";
      createFreePrivateMatchButton.textContent = "Create Match";
    }
  }
  
  // When the user clicks on No, hide the modal
  noButton.onclick = function() {
    document.getElementById("resign").style.display = "none";
    document.getElementById("draw").style.display = "none";
    modal.style.display = "none";
    if (connectWalletButton.disabled == true){
      placeBetButton.disabled = false;
      placeBetButton.textContent = 'Join Queue';
    }
    findMatchButton.disabled = false;
    findMatchButton.textContent = 'Join Queue';
    createPrivateMatchButton.textContent = "Create Match";   
    createFreePrivateMatchButton.textContent = "Create Match"; 
  }

  // Submit only (end game)
  submitButton.onclick = async function() {
    submitModal.style.display = "none";
    const web3 = new Web3(window.ethereum);
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const currentAccount = accounts[0];
    const contract = new web3.eth.Contract(contractABI, ABIcontract);
    console.log(resultGameId);
    console.log(resultColour);
    console.log(resultIpfs);
    const gasEstimate = await contract.methods.submitResults(resultGameId, resultColour, resultIpfs).estimateGas({ from: currentAccount });
    const result = await contract.methods.submitResults(resultGameId, resultColour, resultIpfs).send({ from: currentAccount, gas: gasEstimate });
    console.log('submit results function called, result:', result);
  }
  // Submit and withdraw (end game)
  submitAndWithdrawButton.onclick = async function() {
    submitModal.style.display = "none";
    const web3 = new Web3(window.ethereum);
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const currentAccount = accounts[0];
    const contract = new web3.eth.Contract(contractABI, ABIcontract);
    console.log(resultGameId);
    console.log(resultColour);
    console.log(resultIpfs);
    const gasEstimate = await contract.methods.submitAndWithdraw(resultGameId, resultColour, resultIpfs).estimateGas({ from: currentAccount });
    const result = await contract.methods.submitAndWithdraw(resultGameId, resultColour, resultIpfs).send({ from: currentAccount, gas: gasEstimate });
    console.log('submit results function called, result:', result);
  }
}

// Buttons for connect login signup
connectWalletButton.addEventListener('click', connectWallet);
findMatchButton.addEventListener('click', findMatch);
findMatchButton.disabled = false; // Initially enable the find match button

// Withdraw winnins event
withdrawWinningsButton.addEventListener('click', async () => {
  try {
  submitModal.style.display = "none";
  const web3 = new Web3(window.ethereum);
  const accounts = await ethereum.request({ method: 'eth_accounts' });
  const currentAccount = accounts[0];
  const contract = new web3.eth.Contract(contractABI, ABIcontract);
  const gasEstimate = await contract.methods.withdrawAll().estimateGas({ from: currentAccount });
  const result = await contract.methods.withdrawAll().send({ from: currentAccount, gas: gasEstimate });
  console.log('submit results function called, result:', result);
} catch (error) {
    console.error('Error withdrawing winnings:', error);
  }
});

// Event listener for wager queue
placeBetButton.addEventListener('click', async () => {
  try {
    const betAmountEth = 0.069; // Set the constant bet amount in ETH
    const betAmountWei = web3.utils.toWei(betAmountEth.toString(), 'ether'); // Convert to Wei
    const message = { type: 'place_wager', betAmountWei: betAmountWei };

    // Assuming that walletAddress is already set when the user connects the wallet
    if (walletAddress) {
      sendUserMessage(walletAddress, message);

      // Also call the joinWagerQueue function
      await joinWagerQueue();
    } else {
      console.error("No wallet connected");
    }
  } catch (error) {
    console.error('Error placing wager:', error);
    placeBetButton.textContent = 'Join Queue';
    placeBetButton.disabled = false;
    findMatchButton.disabled = false;
  }
});

createPrivateMatchButton.addEventListener('click', async () => {
  if (createPrivateMatchButton.textContent == 'Create Match'){
  try {

    // Check if the user's wallet address is valid
    if (walletAddress) {
      // Call the createPrivateMatch function
      createGame(walletAddress);

      // Log the result
      console.log('Private match created');
    } else {
      console.error("No wallet connected");
    }
  } catch (error) {
    console.error('Error creating private match:', error);
  }
} else {      
  if (navigator.clipboard) {
    const gameCode = createPrivateMatchButton.textContent;
  // Copy the game ID to the clipboard
  navigator.clipboard.writeText(gameCode)
    .then(() => {
      console.log('Game ID copied to clipboard');
      createPrivateMatchButton.textContent = "Copied!"
      setTimeout(() => {
       createPrivateMatchButton.textContent = gameCode;
      }, 2000);
      
    })
    .catch(err => {
      console.error('Could not copy game ID to clipboard: ', err);
    });
  }
}
});

createFreePrivateMatchButton.addEventListener('click', async () => {
  if (createFreePrivateMatchButton.textContent == 'Create Match'){
      createFreeGame();
} else {      
  if (navigator.clipboard) {
    const gameCode = createFreePrivateMatchButton.textContent;
  // Copy the game ID to the clipboard
  navigator.clipboard.writeText(gameCode)
    .then(() => {
      console.log('Game ID copied to clipboard');
      createFreePrivateMatchButton.textContent = "Copied!"
      setTimeout(() => {
       createFreePrivateMatchButton.textContent = gameCode;
      }, 2000);
      
    })
    .catch(err => {
      console.error('Could not copy game ID to clipboard: ', err);
    });
  }
}
});

joinPrivateMatchButton.addEventListener('click', async () => {
  try {
    const gameId = gameIdInput.value; // Get the game id from the input field
    console.log("Right here");
    console.log(walletAddress);
    console.log("Right here");

    // Check if the user's wallet address is valid
    if (walletAddress) {
      // Call the joinPrivateMatch function
      let smart_gameId = await joinGame_attempt(gameId);
      const web3 = new Web3(window.ethereum);
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      const currentAccount = accounts[0];
      const contract = new web3.eth.Contract(contractABI, ABIcontract);
      const betAmountEther = 0.0001;
      const betAmountWei = web3.utils.toWei(betAmountEther.toString(), 'ether');
      const gasEstimate = await contract.methods.acceptGame(smart_gameId).estimateGas({ from: walletAddress, value: betAmountWei });
      console.log(`Estimated gas: ${gasEstimate}`);
      const result = await contract.methods.acceptGame(smart_gameId).send({ from: walletAddress, value: betAmountWei, gas: gasEstimate });
      
      await joinGame(gameId);

      // Log success
      console.log('Successfully joined private match');
    } else {
      console.error("No wallet connected");
    }
  } catch (error) {
    console.error('Error joining private match:', error);
  }
});

joinFreePrivateMatchButton.addEventListener('click', async () => {
      const gameId = freeGameIdInput.value; // Get the game id from the input field
      await joinFreeGame(gameId);
});

        // Handle early access form submission
        document.getElementById('early-access-form').onsubmit = function(e) {
          e.preventDefault();
          // You can put the logic here for sending the email and confirming it
          // Once confirmed, show the modal:
          var email = document.getElementById("email-input").value;
          showModal(accessListModal);
          const message = { type: 'access_list_add', useremail: email };
          ws.send(JSON.stringify(message));
        }
}

// This is needed for join wager queue
function sendUserMessage(walletAddress, message) {
  const socket = findSocketByAddress(walletAddress);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.error('WebSocket not open for wallet', walletAddress);
  }
}

// Function to initialize window
async function init() {
  const web3 = new Web3(window.ethereum);
  await window.ethereum.enable();
}

// Join wager queue
async function joinWagerQueue() {
  chess.reset();
  renderBoard();
  const web3 = new Web3(window.ethereum);
  const accounts = await ethereum.request({ method: 'eth_accounts' });
  const currentAccount = accounts[0];
  const betAmountEther = 0.0001;
  const betAmountWei = web3.utils.toWei(betAmountEther.toString(), 'ether');

  // Create a contract instance
  const contract = new web3.eth.Contract(contractABI, ABIcontract);
  
  // Listen for GameStarted event after joining the queue
  contract.events.GameStarted()
    .on('data', (event) => {
      console.log("JUST CHECKING IT MIGHT ACCIDENTLY BE IN HERE ON QUEUE JOIN");
      console.log(`Game started event fired. Player1: ${event.returnValues.player1}, Player2: ${event.returnValues.player2}`);
      //resultGameId = gameId;
      
      // Extract the players' addresses and game ID from the event data
      const player1Address = event.returnValues.player1;
      const player2Address = event.returnValues.player2;
      const gameId = event.returnValues.gameId;
      resultGameId = gameId;
      console.log(`${gameId}, ${player1Address}, ${player2Address}`);
      console.log(`${currentAccount}`);
      
      // Update the game state
      gameState.currentGameId = gameId;
      gameState.currentAccount = currentAccount; // Update with currentAccount instead of player1Address
      
      // Find the corresponding websockets based on their stored wallet addresses
      console.log(`Looking for WebSockets for Player1 and Player2. Current map:`, walletToSocketMap);
      const player1Socket = findSocketByAddress(player1Address);
      const player2Socket = findSocketByAddress(player2Address);
      console.log(`${player1Socket}`);
      console.log(`${player2Socket}`);

      // Assign the correct socket to gameState
      if (currentAccount === player1Address && player1Socket) {
        gameState.player1Socket = player1Socket;
      } else if (currentAccount === player2Address && player2Socket) {
        gameState.player1Socket = player2Socket;
      }
      
      // Add the game to the activeGames object
      activeGames[gameId] = { player1Socket, player2Socket };
      console.log(`Added game to active games object:`, activeGames);
      
      // Send the 'set_color' messages to the players
      if (player1Socket) {
        player1Socket.send(JSON.stringify({ type: 'set_color', color: 'w', walletAddress: player1Address, gameId: resultGameId }));
        console.log("resultGameId");
        console.log(resultGameId);
        resultColour = 1;
        isBlack = "w";
        renderBoard();
      }
      if (player2Socket) {
        player2Socket.send(JSON.stringify({ type: 'set_color', color: 'b', walletAddress: player2Address, gameId: resultGameId }));
        console.log("resultGameId");
        console.log(resultGameId);
        resultColour = 2;
        isBlack = "b";
        renderBoard();
      }

      // Enable the game start button once game has started (TODO - maybe delete this, i think its useless?)
      document.getElementById('start-game-button').disabled = false;
    })
    .on('error', console.error);

  // Call the contract function to join the queue
  console.log('Calling contract function joinQueue...');
  placeBetButton.disabled = true;
  findMatchButton.disabled = true;
  placeBetButton.textContent = 'Waiting for wallet...';
  const gasEstimate = await contract.methods.joinQueue().estimateGas({ from: currentAccount, value: betAmountWei });
  console.log(`Estimated gas: ${gasEstimate}`);
  const result = await contract.methods.joinQueue().send({ from: currentAccount, value: betAmountWei, gas: gasEstimate });
  console.log('joinQueue function called, result:', result);
  placeBetButton.textContent = 'Searching for match...';  
  const message = { type: 'join_wager_queue', walletAddress: myWallet };
  ws.send(JSON.stringify(message));
  console.log("Congrats you claled join wager queue (client side)");
}

// Function used to start all games
function tryStartGame() {
  while (waitingPlayers.length >= 2) {
    const whiteID = waitingPlayers.shift();
    const blackID = waitingPlayers.shift();

    // Get the socket objects by the client IDs
    const whiteSocket = clients.find(client => client.id === whiteID).socket;
    const blackSocket = clients.find(client => client.id === blackID).socket;

  // Check whether the players' wallet addresses are in the map
  if (!walletToSocketMap.has(player1Socket.walletAddress) || !walletToSocketMap.has(player2Socket.walletAddress)) {
    console.error('Could not find socket for one or both players');
    // Put the players back in the waiting list so we can try again later
    waitingPlayers.unshift(player1Socket, player2Socket);
    return;
    }
  }
}