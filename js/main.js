import { auth, db } from '/js/firebase-init.js';

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";

onAuthStateChanged(auth, user => {
    if (user) {
        console.log("Usuário encontrado, redirecionando para o dashboard...");
        window.location.replace('/pages/dashboard.html');
    } else {
        console.log("Nenhum usuário, redirecionando para o login...");
        window.location.replace('/login.html');
    }
});