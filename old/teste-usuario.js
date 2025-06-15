// Importe as funções do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyByRhYfsV9g1EFjBmdSx_5bHCPBkib_It0",
    authDomain: "my-anime-lintz.firebaseapp.com",
    projectId: "my-anime-lintz",
    storageBucket: "my-anime-lintz.firebasestorage.app",
    messagingSenderId: "369796437978",
    appId: "1:369796437978:web:a18960700b93a6c51852e3"
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Referências aos elementos HTML
const loginButton = document.getElementById('loginTestButton');
const resultOutput = document.getElementById('resultOutput');

// Ouve o clique no botão
loginButton.addEventListener('click', () => {
    // ======================================================
    //     COLOQUE AQUI O E-MAIL E SENHA DE UM USUÁRIO
    //          QUE VOCÊ ACABOU DE REGISTRAR
    // ======================================================
    const testEmail = "email.do.novo.usuario@exemplo.com";
    const testPassword = "senhaDoNovoUsuario";

    resultOutput.textContent = `Tentando fazer login como ${testEmail}...`;
    
    signInWithEmailAndPassword(auth, testEmail, testPassword)
        .catch(error => {
            console.error("Erro no login de teste:", error);
            resultOutput.textContent = `Erro no login: ${error.message}`;
        });
});


// Este é o nosso verificador da verdade.
// Ele sempre nos mostra o estado mais recente do usuário logado.
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("=========================================");
        console.log("VERDADEIRO ESTADO DO USUÁRIO RECEBIDO:");
        console.log(user); // Imprime o objeto inteiro do usuário no console
        
        const userInfo = {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName, // A informação que queremos!
            photoURL: user.photoURL,
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime
        };
        
        console.log("Nome de Exibição extraído:", userInfo.displayName);
        console.log("=========================================");
        
        // Exibe as informações na tela
        resultOutput.textContent = JSON.stringify(userInfo, null, 2);

    } else {
        resultOutput.textContent = "Nenhum usuário logado no momento.";
    }
});