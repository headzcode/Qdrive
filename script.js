// Importe os módulos necessários do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getDatabase, set, ref as dbRef, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCzYNZNSqCZkvtzqC8-JIIKExtGVKJC6tc",
  authDomain: "marketsrc-cb564.firebaseapp.com",
  databaseURL: "https://marketsrc-cb564-default-rtdb.firebaseio.com",
  projectId: "marketsrc-cb564",
  storageBucket: "marketsrc-cb564.appspot.com",
  messagingSenderId: "929727087008",
  appId: "1:929727087008:web:d6bd0c309c54da5b1f64c5"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const database = getDatabase(app);

// Elementos DOM
const fileInput = document.getElementById('file-upload');
const generateButton = document.getElementById('generate-code');
const uniqueCodeElement = document.getElementById('unique-code');
const generatedCode = document.getElementById('generated-code');
const codeInput = document.getElementById('code-input');
const downloadButton = document.getElementById('download-file');
const totalFilesElement = document.getElementById('total-files');
const totalDownloadsElement = document.getElementById('total-downloads');
const statsChartCanvas = document.getElementById('stats-chart')?.getContext('2d');

// Verifica se todos os elementos DOM existem
if (!fileInput || !generateButton || !uniqueCodeElement || !generatedCode || !codeInput || !downloadButton || !totalFilesElement || !totalDownloadsElement || !statsChartCanvas) {
  console.error('Um ou mais elementos DOM não foram encontrados.');
}

let totalFiles = 0;
let totalDownloads = 0;

// Função para gerar um código único
function generateUniqueCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Evento de clique no botão "Gerar Código"
generateButton.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert('Por favor, selecione um arquivo.');
    return;
  }

  // Gera um código único
  const uniqueCode = generateUniqueCode();

  // Referência ao Firebase Storage
  const storageRef = ref(storage, `files/${uniqueCode}-${file.name}`);

  try {
    // Faz o upload do arquivo
    await uploadBytes(storageRef, file);
    console.log('Arquivo enviado com sucesso.');

    // Obtém a URL de download
    const downloadURL = await getDownloadURL(storageRef);

    // Salva o código e a URL no Firebase Realtime Database
    await set(dbRef(database, `codes/${uniqueCode}`), { url: downloadURL, downloads: 0 });

    // Atualiza as estatísticas
    totalFiles++;
    updateStats();

    // Exibe o código gerado
    uniqueCodeElement.textContent = uniqueCode;
    generatedCode.style.display = 'block';
  } catch (error) {
    console.error('Erro ao enviar o arquivo:', error);
    alert('Ocorreu um erro ao enviar o arquivo. Tente novamente.');
  }
});

// Evento de clique no botão "Baixar Arquivo"
downloadButton.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code) {
    alert('Por favor, insira um código válido.');
    return;
  }

  try {
    // Busca o código no Firebase Realtime Database
    const codeRef = dbRef(database, `codes/${code}`);
    const snapshot = await get(codeRef);

    if (snapshot.exists()) {
      const fileData = snapshot.val();
      const fileURL = `${fileData.url}?alt=media`; // Força o download com ?alt=media

      // Verifica se a URL pertence ao Firebase Storage
      if (!fileURL.includes('firebasestorage.googleapis.com')) {
        alert('Link inválido ou não autorizado.');
        return;
      }

      // Atualiza o contador de downloads
      await update(codeRef, { downloads: (fileData.downloads || 0) + 1 });

      // Atualiza as estatísticas globais
      totalDownloads++;
      updateStats();

      // Cria um link de download dinâmico
      const downloadLink = document.createElement('a');
      downloadLink.href = fileURL;
      downloadLink.download = fileURL.split('/').pop(); // Extrai o nome do arquivo da URL
      downloadLink.setAttribute('download', ''); // Força o download
      downloadLink.click();
    } else {
      alert('Código inválido ou expirado.');
    }
  } catch (error) {
    console.error('Erro ao buscar o arquivo:', error);
    alert('Ocorreu um erro ao buscar o arquivo. Tente novamente.');
  }
});

// Atualiza as estatísticas na tela
function updateStats() {
  totalFilesElement.textContent = totalFiles;
  totalDownloadsElement.textContent = totalDownloads;

  // Atualiza o gráfico
  if (statsChart) {
    statsChart.data.datasets[0].data = [totalFiles, totalDownloads];
    statsChart.update();
  }
}

// Inicializa o gráfico
let statsChart;
if (statsChartCanvas) {
  statsChart = new Chart(statsChartCanvas, {
    type: 'bar',
    data: {
      labels: ['Arquivos Enviados', 'Downloads Realizados'],
      datasets: [{
        label: 'Estatísticas',
        data: [totalFiles, totalDownloads],
        backgroundColor: ['#6e8efb', '#a777e3'],
        borderColor: ['#6e8efb', '#a777e3'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Carrega as estatísticas iniciais
(async () => {
  const codesSnapshot = await get(dbRef(database, 'codes'));
  if (codesSnapshot.exists()) {
    const codes = codesSnapshot.val();
    totalFiles = Object.keys(codes).length;
    totalDownloads = Object.values(codes).reduce((sum, code) => sum + (code.downloads || 0), 0);
    updateStats();
  }
})();
