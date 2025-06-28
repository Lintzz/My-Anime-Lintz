import { auth, db } from '/src/scripts/config/firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, limit } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

// --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
const listaDeAmigosEl = document.getElementById('lista-de-amigos');
const loadingStateEl = document.getElementById('loading-state');
const amigosVazioEl = document.getElementById('amigos-vazio');

const searchFormEl = document.getElementById('search-users-form');
const searchInputEl = document.getElementById('search-input');
const searchResultsContainerEl = document.getElementById('search-results-container');
const searchResultsListEl = document.getElementById('search-results-list');
const searchResultsTitleEl = document.getElementById('search-results-title');
const searchEmptyEl = document.getElementById('search-empty-state');

// --- PONTO DE ENTRADA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        carregarAmigos(user.uid);
        setupUserSearch();
    } else {
        // O "vigia" global já cuida do redirecionamento
        console.log("Nenhum usuário logado.");
    }
});


/**
 * Busca e exibe a lista de amigos do usuário logado.
 * @param {string} loggedInUserId - O UID do usuário que está vendo a página.
 */
async function carregarAmigos(loggedInUserId) {
    try {
        const friendshipsRef = collection(db, 'friendships');
        const q = query(friendshipsRef, 
            where('users', 'array-contains', loggedInUserId), 
            where('status', '==', 'friends')
        );
        const friendshipsSnapshot = await getDocs(q);

        if (friendshipsSnapshot.empty) {
            amigosVazioEl.classList.remove('hidden');
            loadingStateEl.classList.add('hidden');
            return;
        }

        const profilePromises = friendshipsSnapshot.docs.map(friendshipDoc => {
            const usersArray = friendshipDoc.data().users;
            const friendId = usersArray.find(id => id !== loggedInUserId);
            return getDoc(doc(db, "profiles", friendId));
        });

        const profileSnapshots = await Promise.all(profilePromises);
        
        let amigosHtml = '';
        profileSnapshots.forEach(profileSnap => {
            if (profileSnap.exists()) {
                const friendData = profileSnap.data();
                amigosHtml += `
                    <li class="amigo-card">
                        <a href="profile.html?id=${friendData.uid}">
                            <img src="${friendData.profilePicUrl || '/src/assets/img/semimagem.jpg'}" alt="Avatar de ${friendData.displayName}" class="amigo-avatar">
                            <span class="amigo-nome">${friendData.displayName || 'Usuário'}</span>
                            <span class="amigo-username">@${friendData.userName}</span>
                        </a>
                    </li>`;
            }
        });

        listaDeAmigosEl.innerHTML = amigosHtml;
        loadingStateEl.classList.add('hidden');

    } catch (error) {
        console.error("Erro ao carregar a lista de amigos:", error);
        loadingStateEl.classList.add('hidden');
        amigosVazioEl.textContent = "Ocorreu um erro ao carregar seus amigos.";
        amigosVazioEl.classList.remove('hidden');
    }
}

/**
 * Configura o listener para o formulário de busca de usuários.
 */
function setupUserSearch() {
    if (!searchFormEl) return;

    searchFormEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        const searchTerm = searchInputEl.value.trim().toLowerCase();

        if (searchTerm.length < 3) {
            alert("Por favor, digite pelo menos 3 caracteres para buscar.");
            return;
        }
        
        buscarUsuarios(searchTerm);
    });
}

/**
 * Executa a busca no Firestore e renderiza os resultados.
 * @param {string} searchTerm - O termo a ser buscado.
 */
async function buscarUsuarios(searchTerm) {
    searchResultsContainerEl.classList.remove('hidden');
    searchEmptyEl.classList.add('hidden');
    searchResultsListEl.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    try {
        const profilesRef = collection(db, 'profiles');
        const q = query(profilesRef, 
            where('userName', '>=', searchTerm),
            where('userName', '<=', searchTerm + '\uf8ff'),
            limit(10)
        );

        const querySnapshot = await getDocs(q);
        searchResultsListEl.innerHTML = '';

        if (querySnapshot.empty) {
            searchEmptyEl.classList.remove('hidden');
        } else {
            querySnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.uid === auth.currentUser.uid) return;

                const userCardHtml = `
                    <li class="amigo-card">
                        <a href="profile.html?id=${userData.uid}">
                            <img src="${userData.profilePicUrl || '/src/assets/img/semimagem.jpg'}" alt="Avatar de ${userData.displayName}" class="amigo-avatar">
                            <span class="amigo-nome">${userData.displayName || 'Usuário'}</span>
                            <span class="amigo-username">@${userData.userName}</span>
                        </a>
                    </li>`;
                searchResultsListEl.innerHTML += userCardHtml;
            });
        }
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        searchResultsListEl.innerHTML = `<li>Ocorreu um erro na busca.</li>`;
    }
}