import { auth } from '/src/scripts/config/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";


document.addEventListener('DOMContentLoaded', () => {
    inicializarAutenticacao();
    inicializarComponentesUI();
});


function inicializarAutenticacao() {
    const botaoSair = document.getElementById('btn-sair');
    const botaoPerfil = document.querySelector('.button-perfil');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            botaoPerfil.classList.remove('loading');
            atualizarUsuarioUI(user);
        } 
    });

    if (botaoSair) {
        botaoSair.addEventListener("click", () => {
            signOut(auth)
                .then(() => {
                    console.log("Logout bem-sucedido.");
                    window.location.href = "/src/pages/login.html";
                })
                .catch((error) => {
                    console.error("Erro ao fazer logout:", error);
                });
        });
    }
}

function inicializarComponentesUI() {
    inicializarModalPerfil();
    ativarLinkMenuAtual();
}

        
function inicializarModalPerfil() {
    const toggleBtn = document.getElementById('togglePerfilBtn');
    const perfilContainer = toggleBtn.parentElement;
    if (toggleBtn && perfilContainer) {
        toggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            perfilContainer.classList.toggle('ativo');
        });
    }

    document.addEventListener('click', (event) => {
        if (perfilContainer && perfilContainer.classList.contains('ativo') && !perfilContainer.contains(event.target)) {
            perfilContainer.classList.remove('ativo');
        }
    });

}

function ativarLinkMenuAtual() {
    const currentPagePath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-menu-link, .perfil-link-header');

    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;

        if (currentPagePath === linkPath) {
            link.classList.add('ativo');
        }
    });
}

function atualizarUsuarioUI(user) {
    const userNameElements = document.querySelectorAll(".userName");
    const userImageElements = document.querySelectorAll(".userProfilePicture");

    userNameElements.forEach(el => {
        el.textContent = user.displayName || "Usuário";
    });

    userImageElements.forEach(el => {
        el.src = user.photoURL || "/src/assets/img/semimagem.jpg";
    });
}
