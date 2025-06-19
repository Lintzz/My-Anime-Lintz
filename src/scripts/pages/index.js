import { auth } from '/src/scripts/config/firebase-init.js';

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";

onAuthStateChanged(auth, user => {
    if (user) {
        console.log("Usuário encontrado, redirecionando para o inicio...");
        window.location.replace('/src/pages/inicio.html');
    } else {
        console.log("Nenhum usuário, redirecionando para o login...");
        window.location.replace('/src/pages/login.html');
    }
});