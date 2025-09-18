// script.js

// ========== Firebase setup ==========

// Your Firebase config (from console)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();

// ========== State variables ==========

let currentUser = null;
let currentCategory = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval = null;
const QUESTION_TIME = 20; // seconds per question
let timeLeft = QUESTION_TIME;

// ========== Elements ==========

const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');

const quizAppScreen = document.getElementById('quiz-app-screen');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');

const categoryScreen = document.getElementById('category-screen');
const categoryButtons = document.querySelectorAll('#category-screen .categories button');

const quizScreen = document.getElementById('quiz-screen');
const categoryTitleElem = document.getElementById('category-title');
const questionTextElem = document.getElementById('question-text');
const optionsContainer = document.getElementById('options');
const nextBtn = document.getElementById('next-btn');

const resultScreen = document.getElementById('result-screen');
const scoreText = document.getElementById('score-text');
const restartBtn = document.getElementById('restart-btn');

const progressInner = document.getElementById('progress-inner');
const timeLeftElem = document.getElementById('time-left');

// ========== Auth logic ==========

showRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});
showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

loginButton.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    currentUser = userCredential.user;
    onLogin();
  } catch (err) {
    alert('Login error: ' + err.message);
  }
});

registerButton.addEventListener('click', async () => {
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    currentUser = userCredential.user;
    onLogin();
  } catch (err) {
    alert('Register error: ' + err.message);
  }
});

logoutButton.addEventListener('click', async () => {
  await auth.signOut();
  currentUser = null;
  showAuthScreen();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    showQuizAppScreen();
  } else {
    showAuthScreen();
  }
});

function showAuthScreen() {
  authScreen.classList.remove('hidden');
  quizAppScreen.classList.add('hidden');
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
}

function showQuizAppScreen() {
  authScreen.classList.add('hidden');
  quizAppScreen.classList.remove('hidden');
  userEmailSpan.innerText = currentUser.email;
}

// ========== Quiz logic ==========

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const catId = btn.getAttribute('data-cat');
    const catName = btn.innerText;
    startQuiz(catId, catName);
  });
});

async function startQuiz(catId, catName) {
  currentCategory = { id: catId, name: catName };
  resetQuizState();
  categoryScreen.classList.add('hidden');
  quizScreen.classList.remove('hidden');
  categoryTitleElem.innerText = `Category: ${catName}`;
  // fetch questions from Open Trivia DB
  try {
    const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${catId}&type=multiple`);
    const data = await response.json();
    questions = data.results.map(q => {
      // combine correct + incorrect, shuffle
      const allOptions = [...q.incorrect_answers];
      allOptions.push(q.correct_answer);
      shuffleArray(allOptions);
      return {
        question: decodeHtml(q.question),
        options: allOptions.map(opt => decodeHtml(opt)),
        correct: decodeHtml(q.correct_answer)
      };
    });
    // start first question
    showQuestion();
  } catch (err) {
    alert('Could not fetch questions: ' + err.message);
  }
}

function showQuestion() {
  const q = questions[currentQuestionIndex];
  questionTextElem.innerText = q.question;
  optionsContainer.innerHTML = '';
  nextBtn.classList.add('hidden');

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.innerText = opt;
    btn.addEventListener('click', () => selectAnswer(opt, btn));
    optionsContainer.appendChild(btn);
  });

  // set timer
  timeLeft = QUESTION_TIME;
  timeLeftElem.innerText = timeLeft;
  startTimer();

  updateProgress();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timeLeftElem.innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      onTimeUp();
    }
  }, 1000);
}

function onTimeUp() {
  // disable options
  Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);
  highlightCorrect();
  nextBtn.classList.remove('hidden');
}

function selectAnswer(selected, btnElem) {
  clearInterval(timerInterval);
  const q = questions[currentQuestionIndex];
  // disable all
  Array.from(optionsContainer.children).forEach(b => {
    b.disabled = true;
    if (b.innerText === q.correct) {
      b.style.backgroundColor = 'green';
    }
    if (b === btnElem && selected !== q.correct) {
      b.style.backgroundColor = 'red';
    }
  });
  if (selected === q.correct) {
    score++;
  }
  nextBtn.classList.remove('hidden');
}

nextBtn.addEventListener('click', () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  quizScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
  scoreText.innerText = `You scored ${score} out of ${questions.length}`;

  // send to backend
  currentUser.getIdToken().then(token => {
    return fetch('http://localhost:3000/api/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        category: currentCategory.name,
        score: score,
        total: questions.length
      })
    });
  }).catch(err => {
    console.error('Error sending score to backend', err);
  });
}

restartBtn.addEventListener('click', () => {
  resultScreen.classList.add('hidden');
  categoryScreen.classList.remove('hidden');
});

function updateProgress() {
  const percent = ((currentQuestionIndex) / questions.length) * 100;
  progressInner.style.width = `${percent}%`;
}

// Utility functions

function shuffleArray(arr) {
  for (let i = arr.length -1; i >0; i--) {
    const j = Math.floor(Math.random() * (i +1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function decodeHtml(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}
