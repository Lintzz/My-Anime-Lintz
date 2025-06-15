import { auth } from '/js/firebase-init.js';

import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";


let isRegistering = false; 

// PÁGINA CARREGA
onAuthStateChanged(auth, (user) => {
    if (user && !isRegistering) {
        //console.log("VIGIA: Usuário já tinha sessão. Redirecionando...");
        window.location.href = '/pages/dashboard.html';
    } else {
        //console.log("VIGIA: Nenhum usuário logado ou em processo de registro. Permanece na página.");
    }
});

// Funções  de Erros
function displayError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function clearError(element) {
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

// google
const provider = new GoogleAuthProvider();
auth.languageCode = 'pt';

function fazerLoginComGoogle(errorDisplayElement) { 
    //console.log("Iniciando processo de login/registro com Google...");
    clearError(errorDisplayElement); 

    signInWithPopup(auth, provider)
        .then((result) => {
            //console.log("Sucesso! Usuário:", result.user.displayName);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Erro durante o login com Google:", errorCode, errorMessage);
            displayError(errorDisplayElement, `Erro no login com Google: ${errorMessage}`);
        });
}

// email/login
async function registrarComEmailSenha(displayName, email, password, registerErrorMessage, confirmPassword) {
    const signupButton = document.getElementById('signupButton');
    
    clearError(registerErrorMessage);

    if (!displayName || displayName.trim() === '') {
        displayError(registerErrorMessage, "Por favor, insira seu nome.");
        return;
    }
    if (password !== confirmPassword) {
        displayError(registerErrorMessage, "As senhas não coincidem!");
        return;
    }
    if (password.length < 6) {
        displayError(registerErrorMessage, "A senha deve ter pelo menos 6 caracteres.");
        return;
    }


    signupButton.disabled = true;
    signupButton.textContent = 'Registrando...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, {
            displayName: displayName
        });

        await user.reload();

        window.location.href = '/pages/index.html';

    } catch (error) {
        const errorCode = error.code;
        console.error("Erro no registro:", errorCode);
        
        let userMessage = "Ocorreu um erro ao registrar.";
        switch (errorCode) {
            case 'auth/email-already-in-use':
                userMessage = "Este e-mail já está em uso.";
                break;
            case 'auth/invalid-email':
                userMessage = "O formato do e-mail é inválido.";
                break;
            case 'auth/weak-password':
                userMessage = "A senha é muito fraca (mínimo 6 caracteres).";
                break;
            default:
                userMessage = "Erro desconhecido. Tente novamente mais tarde.";
        }
        displayError(registerErrorMessage, userMessage);

        signupButton.disabled = false;
        signupButton.textContent = 'Criar Conta';
    }
}

function fazerLoginComEmailSenha(email, password, errorDisplayElement) {
    //console.log("Tentando login com e-mail e senha...");
    clearError(errorDisplayElement);

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            //console.log("Usuário logado com sucesso:", user.email);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Erro no login:", errorCode, errorMessage);

            let userMessage = "Ocorreu um erro ao fazer login.";
            switch (errorCode) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    userMessage = "E-mail ou senha inválidos.";
                    break;
                case 'auth/invalid-email':
                    userMessage = "O formato do e-mail é inválido.";
                    break;
                case 'auth/user-disabled':
                    userMessage = "Este usuário foi desativado.";
                    break;
                default:
                    userMessage = `Erro desconhecido ao fazer login (${errorCode}). Tente novamente.`;
            }
            displayError(errorDisplayElement, userMessage);
        });
}

function enviarEmailRedefinicaoSenha(email, errorDisplayElement) {
    //console.log("Tentando enviar e-mail de redefinição para:", email);
    clearError(errorDisplayElement);

    if (!email) {
        displayError(errorDisplayElement, "Por favor, digite seu e-mail.");
        return;
    }

    sendPasswordResetEmail(auth, email)
        .then(() => {
            //console.log("E-mail de redefinição enviado com sucesso.");
            displayError(errorDisplayElement, "Um e-mail de redefinição de senha foi enviado para " + email + ". Verifique sua caixa de entrada (e a pasta de spam!).");
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Erro ao enviar e-mail de redefinição:", errorCode, errorMessage);

            let userMessage = "Ocorreu um erro ao enviar o e-mail.";
            switch (errorCode) {
                case 'auth/invalid-email':
                    userMessage = "O formato do e-mail é inválido.";
                    break;
                case 'auth/user-not-found':
                    userMessage = "Não há um usuário cadastrado com este e-mail.";
                    break;
                default:
                    userMessage = `Erro desconhecido (${errorCode}). Tente novamente mais tarde.`;
            }
            displayError(errorDisplayElement, userMessage);
        });
}

//  manipulação do DOM.
document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');

    const loginErrorMessage = document.getElementById('login-error-message');
    const registerErrorMessage = document.getElementById('register-error-message');
    const forgotPasswordErrorMessage = document.getElementById('forgot-password-error-message');

    // Controle dos Modais
    function openLoginModal() {
        if (loginModal) loginModal.style.display = 'flex';
        clearError(loginErrorMessage);
    }

    function closeLoginModal() {
        if (loginModal) loginModal.style.display = 'none';
        clearError(loginErrorMessage);
    }

    function openRegisterModal() {
        if (registerModal) registerModal.style.display = 'flex';
        clearError(registerErrorMessage);
    }

    function closeRegisterModal() {
        if (registerModal) registerModal.style.display = 'none';
        clearError(registerErrorMessage);
    }

    function openForgotPasswordModal() {
        if (forgotPasswordModal) forgotPasswordModal.style.display = 'flex';
        closeLoginModal();
        closeRegisterModal();
        clearError(forgotPasswordErrorMessage);
    }

    function closeForgotPasswordModal() {
        if (forgotPasswordModal) forgotPasswordModal.style.display = 'none';
        clearError(forgotPasswordErrorMessage);
    }

    function switchToLoginModal() {
        closeRegisterModal();
        closeForgotPasswordModal();
        openLoginModal();
    }

    function switchToRegisterModal() {
        closeLoginModal();
        openRegisterModal();
    }


    // HEADER BUTTONS para abrir modais
    const openLoginButton = document.getElementById('open-login-button');
    if (openLoginButton) {
        openLoginButton.addEventListener('click', openLoginModal);
    }

    const openRegisterButtonHeader = document.getElementById('open-register-button-header');
    if (openRegisterButtonHeader) {
        openRegisterButtonHeader.addEventListener('click', openRegisterModal);
    }

    const openRegisterButtonHero = document.getElementById('open-register-button-hero');
    if (openRegisterButtonHero) {
        openRegisterButtonHero.addEventListener('click', openRegisterModal);
    }

    const openRegisterButtonCta = document.getElementById('open-register-button-cta');
    if (openRegisterButtonCta) {
        openRegisterButtonCta.addEventListener('click', openRegisterModal);
    }

    const closeLoginModalBtn = document.getElementById('close-login-modal');
    if (closeLoginModalBtn) {
        closeLoginModalBtn.addEventListener('click', closeLoginModal);
    }

    const closeRegisterModalBtn = document.getElementById('close-register-modal');
    if (closeRegisterModalBtn) {
        closeRegisterModalBtn.addEventListener('click', closeRegisterModal);
    }

    const closeForgotPasswordModalBtn = document.getElementById('close-forgot-password-modal');
    if (closeForgotPasswordModalBtn) {
        closeForgotPasswordModalBtn.addEventListener('click', closeForgotPasswordModal);
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const email = document.getElementById("email-login").value;
            const password = document.getElementById("senha-login").value;
            fazerLoginComEmailSenha(email, password, loginErrorMessage); 
            auth.onAuthStateChanged(user => {
                if (user) closeLoginModal();
            });
        });
    }

    const registroForm = document.getElementById("registro-form");
    if (registroForm) {
        registroForm.addEventListener("submit", (event) => {
            event.preventDefault();

            isRegistering = true;
            
            const displayName = document.getElementById("register-displayName").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            const errorDisplayElement = document.getElementById("registerErrorMessage");

            registrarComEmailSenha(displayName, email, password, errorDisplayElement, confirmPassword);
        });

    }

    const forgotPasswordForm = document.getElementById("forgot-password-form");
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const email = document.getElementById("forgot-email").value;
            enviarEmailRedefinicaoSenha(email, forgotPasswordErrorMessage);
        });
    }

    const googleLoginBtn = document.getElementById("google-login-btn");
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", () => fazerLoginComGoogle(loginErrorMessage));
    }

    const googleRegisterBtn = document.getElementById("google-register-btn");
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener("click", () => fazerLoginComGoogle(registerErrorMessage));
    }

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }

    const switchToRegisterLink = document.getElementById('switch-to-register-link');
    if (switchToRegisterLink) {
        switchToRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchToRegisterModal();
        });
    }

    const switchToLoginLinkRegister = document.getElementById('switch-to-login-link-register');
    if (switchToLoginLinkRegister) {
        switchToLoginLinkRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLoginModal();
        });
    }

    const switchToLoginLinkForgot = document.getElementById('switch-to-login-link-forgot');
    if (switchToLoginLinkForgot) {
        switchToLoginLinkForgot.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLoginModal();
        });
    }

});