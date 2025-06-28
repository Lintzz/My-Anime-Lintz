
import { auth, db } from '/src/scripts/config/firebase-init.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { doc, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

const form = document.getElementById('complete-profile-form');
const avatarPreview = document.getElementById('avatar-preview');
const avatarUrlInput = document.getElementById('avatar-url-input');
const nomeInput = document.getElementById('nome-input');
const usernameInput = document.getElementById('username-input');
const usernameStatus = document.getElementById('username-status');
const saveButton = document.getElementById('salvar-perfil-btn');
const buttonText = saveButton.querySelector('.btn-text');
const spinner = saveButton.querySelector('.spinner');

const placeholderImg = '/src/assets/img/semimagem.jpg';

preencherFormularioComDadosDoGoogle();

onAuthStateChanged(auth, (user) => {
    if (user) {
        setupPageFunctionality(user);
    } else {
        console.warn("Nenhum usuário logado. Redirecionando para login...");
        window.location.href = '/src/pages/login.html';
    }
});

function preencherFormularioComDadosDoGoogle() {
    const storedData = sessionStorage.getItem('googleProfileData');
    if (storedData) {
        console.log("Dados do Google encontrados, pré-preenchendo o formulário.");
        const googleData = JSON.parse(storedData);

        if (googleData.displayName) {
            nomeInput.value = googleData.displayName;
        }
        if (googleData.photoURL) {
            avatarUrlInput.value = googleData.photoURL;
            avatarPreview.src = googleData.photoURL; 
        }

        sessionStorage.removeItem('googleProfileData');
    }
}


function setupPageFunctionality(user) {
    
    avatarUrlInput.addEventListener('input', () => {
        const newUrl = avatarUrlInput.value.trim();
        if (newUrl && (newUrl.startsWith('http://') || newUrl.startsWith('https://'))) {
            avatarPreview.src = newUrl;
        } else {
            avatarPreview.src = placeholderImg;
        }
    });

    avatarPreview.addEventListener('error', () => {
        avatarPreview.src = placeholderImg;
    });

    let debounceTimer;
    usernameInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            verificarUsername(usernameInput.value);
        }, 500);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        saveButton.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');

        const displayName = nomeInput.value.trim();
        const userName = usernameInput.value.trim().toLowerCase();
        const profilePicUrl = avatarPreview.src;

        if (!displayName || !userName) {
            alert('Por favor, preencha o Nome de Exibição e o Nome de Usuário.');
            resetButtonUI();
            return;
        }

        try {
            const isAvailable = await verificarUsername(userName);
            if (!isAvailable) {
                alert('Este nome de usuário não está disponível. Por favor, escolha outro.');
                resetButtonUI();
                return;
            }

            await updateProfile(auth.currentUser, {
                displayName: displayName,
                photoURL: profilePicUrl
            });

            const batch = writeBatch(db);

            const usernameRef = doc(db, "usernames", userName);
            batch.set(usernameRef, { uid: user.uid });

            const userProfileRef = doc(db, "profiles", user.uid);
            batch.set(userProfileRef, {
                uid: user.uid,
                userName: userName,
                displayName: displayName,
                profilePicUrl: profilePicUrl,
                bio: "",
                bannerUrl: "", 
                favoriteGenres: [], 
                createdAt: new Date() 
            }, { merge: true });

            await batch.commit();

            console.log("Perfil completo e salvo com sucesso!");
            window.location.href = '/src/pages/inicio.html';

        } catch (error) {
            console.error("Erro ao salvar o perfil: ", error);
            alert("Ocorreu um erro ao salvar seu perfil. Por favor, tente novamente.");
            resetButtonUI();
        }
    });
}


async function verificarUsername(username) {
    const usernameStatusDiv = document.getElementById('username-status');
    usernameStatusDiv.textContent = 'Verificando...';
    usernameStatusDiv.className = 'checking';

    if (!username || username.length < 3) {
        usernameStatusDiv.textContent = 'Deve ter no mínimo 3 caracteres.';
        usernameStatusDiv.className = 'unavailable';
        return false;
    }
    
    const formattedUsername = username.toLowerCase();
    const usernameRef = doc(db, "usernames", formattedUsername);
    
    try {
        const docSnap = await getDoc(usernameRef);
        if (docSnap.exists()) {
            usernameStatusDiv.textContent = 'Este @usuário já está em uso.';
            usernameStatusDiv.className = 'unavailable';
            return false;
        } else {
            usernameStatusDiv.textContent = 'Disponível!';
            usernameStatusDiv.className = 'available';
            return true;
        }
    } catch (error) {
        console.error("Erro ao verificar username:", error);
        usernameStatusDiv.textContent = 'Erro ao verificar.';
        usernameStatusDiv.className = 'unavailable';
        return false;
    }
}

function resetButtonUI() {
    saveButton.disabled = false;
    buttonText.classList.remove('hidden');
    spinner.classList.add('hidden');
}