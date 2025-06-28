
import { auth, db } from '/src/scripts/config/firebase-init.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { enviarPedidoDeAmizadeService, aceitarPedidoService, removerRelacionamentoService } from '/src/scripts/core/friendship-service.js';

const profileForm = document.getElementById('edit-profile-form');
const openModalButton = document.getElementById('edit-profile-btn');
const closeModalButton = document.getElementById('close-modal-btn');
const modalOverlay = document.getElementById('edit-modal');

const editProfileBtn = document.getElementById("edit-profile-btn")
const friendActionBtn = document.getElementById("friend-action-btn")

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        const loggedInUserId = user ? user.uid : null;

        const params = new URLSearchParams(window.location.search);
        const profileIdFromUrl = params.get('id');

        let targetUserId;

        if (profileIdFromUrl) {
            targetUserId = profileIdFromUrl; 
        } else if (loggedInUserId) {
            targetUserId = loggedInUserId;
        } else {
            window.location.href = '/src/pages/login.html';
            return;
        }

        loadAndDisplayProfileData(targetUserId);

        if (loggedInUserId && loggedInUserId === targetUserId) {
            setupProfileOwnerControls();
        } else {
            setupPublicProfileControls(loggedInUserId, targetUserId); 
        }
    });
});

async function loadAndDisplayProfileData(userId) {
    try {
        const profilePromise = getDoc(doc(db, "profiles", userId));
        const animesPromise = getDocs(collection(db, 'users', userId, 'animes'));
        const friendCountPromise = loadFriendCount(userId);
        
        const [profileDocSnap, animesSnapshot] = await Promise.all([profilePromise, animesPromise]);
        await friendCountPromise; 

        if (profileDocSnap.exists()) {
            const data = profileDocSnap.data();
            document.querySelector('#usuario').textContent = `@${data.userName}`;
            document.querySelector('.NomePerfil').textContent = data.displayName || 'Usuário';
            document.querySelector('.bio').textContent = data.bio || 'Adicione uma bio...';
            if (data.bannerUrl) document.querySelector('.banner-img').src = data.bannerUrl;
            if (data.profilePicUrl) document.querySelector('.FotoPerfil').src = data.profilePicUrl;

            if (data.favoriteCharacters) {
                exibirPersonagensFavoritos(data.favoriteCharacters);
            }
        } else {
            document.querySelector('.NomePerfil').textContent = 'Perfil não encontrado';
        }

        processAndDisplayAnimeStats(animesSnapshot);
    } catch (error) {
        console.error("Erro ao carregar dados do perfil:", error);
    }
}

async function loadFriendCount(userId) {
    const friendCountEl = document.getElementById('friend-count');
    if (!friendCountEl) return;
    try {
        const q = query(collection(db, 'friendships'),
            where('users', 'array-contains', userId),
            where('status', '==', 'friends')
        );
        const querySnapshot = await getDocs(q);
        friendCountEl.textContent = querySnapshot.size;
    } catch (error) {
        console.error("Erro ao contar amigos:", error);
        friendCountEl.textContent = '0';
    }
}


function setupProfileOwnerControls() {
    if (editProfileBtn) {
        editProfileBtn.style.display = 'inline-block';
        editProfileBtn.addEventListener('click', handleOpenModal);
    }
    if (friendActionBtn) {
        friendActionBtn.style.display = 'none'; 
    }
    
    if(closeModalButton) closeModalButton.addEventListener('click', handleCloseModal);
    if(modalOverlay) modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) handleCloseModal(); });
    if(profileForm) profileForm.addEventListener('submit', salvarPerfil);
    setupListInteraction('personagem-search-input', 'personagem-list');
}


















async function verificarStatusAmizade(loggedInUserId, targetUserId) {
    if (!loggedInUserId) {
        return 'deslogado';
    }
    if (loggedInUserId === targetUserId) {
        return 'proprio_perfil';
    }

    const ids = [loggedInUserId, targetUserId];
    ids.sort(); 
    const friendshipId = ids.join('_'); 

    try {
        const friendshipRef = doc(db, 'friendships', friendshipId);
        const docSnap = await getDoc(friendshipRef);

        if (!docSnap.exists()) {
            return 'nao_sao_amigos';
        } else {
            const data = docSnap.data();
            
            if (data.status === 'friends') {
                return 'sao_amigos';
            } else if (data.status === 'pending') {
                if (data.requestedBy === loggedInUserId) {
                    return 'convite_enviado_por_mim';
                } else {
                    return 'convite_recebido';
                }
            }
        }
    } catch (error) {
        console.error("Erro ao verificar status de amizade:", error);
        return 'erro';
    }
}

function updateUIToAmigosState(container, friendId) {
    container.innerHTML = `<button id="friend-action-btn" class="amigo-btn">⭐ Amigos</button>`;
    const newButton = container.querySelector('#friend-action-btn');
    if (newButton) {
        newButton.onclick = () => desfazerAmizadeHandler(friendId);
    }
}

function updateUIToNaoAmigosState(container, targetUserId) {
    const loggedInUserId = auth.currentUser ? auth.currentUser.uid : null;
    container.innerHTML = `<button id="friend-action-btn" class="amigo-btn">Adicionar Amigo</button>`;
    const newButton = container.querySelector('#friend-action-btn');
    if (newButton) {
        newButton.onclick = async () => {
            newButton.disabled = true;
            const success = await enviarPedidoDeAmizadeService(loggedInUserId, targetUserId);
            if (success) {
                // Após enviar, podemos simplesmente chamar a função de setup de novo,
                // pois o estado 'convite_enviado' é fácil de ler sem latência.
                setupPublicProfileControls(loggedInUserId, targetUserId);
            } else {
                newButton.disabled = false;
            }
        };
    }
}

async function setupPublicProfileControls(loggedInUserId, targetUserId) {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const friendActionBtnInitial = document.getElementById('friend-action-btn'); // Pega a referência inicial
    if (!friendActionBtnInitial) return;

    const buttonsContainer = friendActionBtnInitial.parentElement;

    // Mostra o estado de carregamento inicial
    if (editProfileBtn) editProfileBtn.style.display = 'none';
    buttonsContainer.innerHTML = `<button id="friend-action-btn" class="amigo-btn" disabled>Carregando...</button>`;
    
    // Pega a referência ao novo botão que acabamos de criar
    const friendButton = document.getElementById('friend-action-btn');

    const status = await verificarStatusAmizade(loggedInUserId, targetUserId);
    console.log("Status da Amizade Atual:", status);

    switch (status) {
        case 'nao_sao_amigos':
            friendButton.textContent = 'Adicionar Amigo';
            friendButton.disabled = false;
            friendButton.onclick = async () => {
                friendButton.disabled = true;
                const success = await enviarPedidoDeAmizadeService(loggedInUserId, targetUserId);
                // Após a ação, simplesmente chame o setup de novo para redesenhar o estado correto.
                if (success) setupPublicProfileControls(loggedInUserId, targetUserId);
                else friendButton.disabled = false;
            };
            break;

        case 'convite_enviado_por_mim':
            friendButton.textContent = '🕒 Convite Enviado';
            friendButton.disabled = false;
            friendButton.onclick = async () => {
                friendButton.disabled = true;
                const success = await removerRelacionamentoService(loggedInUserId, targetUserId);
                if (success) setupPublicProfileControls(loggedInUserId, targetUserId); // Redesenha
                else friendButton.disabled = false;
            };
            break;

        case 'convite_recebido':
            buttonsContainer.innerHTML = `
                <button id="accept-btn" class="amigo-btn">Aceitar</button>
                <button id="decline-btn" class="amigo-btn">Recusar</button>
            `;
            document.getElementById('accept-btn').onclick = async () => {
                const success = await aceitarPedidoService(loggedInUserId, targetUserId);
                if (success) {
                    updateUIToAmigosState(buttonsContainer, targetUserId);
                }
            };
            document.getElementById('decline-btn').onclick = async () => {
                const success = await removerRelacionamentoService(loggedInUserId, targetUserId);
                if (success) {
                    updateUIToNaoAmigosState(buttonsContainer, targetUserId);
                }
            };
            break;

        case 'sao_amigos':
            friendButton.textContent = '⭐ Amigos';
            friendButton.disabled = false;
            friendButton.onclick = async () => {
                if (!confirm("Você tem certeza que quer desfazer esta amizade?")) return;
                friendButton.disabled = true;
                const success = await removerRelacionamentoService(loggedInUserId, targetUserId);
                if (success) setupPublicProfileControls(loggedInUserId, targetUserId); 
                else friendButton.disabled = false;
            };
            break;

        // Casos 'deslogado' e 'erro' não têm ações, então continuam iguais
        case 'deslogado':
            friendButton.textContent = 'Faça login para adicionar';
            break;
        case 'erro':
            friendButton.textContent = 'Erro ao carregar';
            break;
    }
}






















function handleOpenModal() {
    popularModalComDadosAtuais().catch(error => {
        console.error("Falha ao preparar o modal para edição:", error);
        alert("Não foi possível carregar seus dados para edição.");
    });
    modalOverlay.classList.add('visible');
}

function handleCloseModal() {
    modalOverlay.classList.remove('visible');
}

async function salvarPerfil(event) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Você precisa estar logado!");

    try {
        let profileUpdates = {};
        let authUpdates = {};

        const newPhotoURL = document.getElementById('profile-pic-input').value.trim();
        const newBannerURL = document.getElementById('banner-input').value.trim();
        if (newPhotoURL) {
            profileUpdates.profilePicUrl = newPhotoURL;
            authUpdates.photoURL = newPhotoURL;
        }
        if (newBannerURL) {
            profileUpdates.bannerUrl = newBannerURL;
        }

        const newUserName = document.getElementById('name-input').value;
        if (newUserName) {
            profileUpdates.displayName = newUserName;
            authUpdates.displayName = newUserName;
        }
        
        profileUpdates.bio = document.getElementById('bio-input').value;

        const getItemsFromList = (listId) => {
            const items = [];
            document.querySelectorAll(`#${listId} li`).forEach(li => items.push(li.firstChild.textContent.trim()));
            return items;
        };
        profileUpdates.favoriteCharacters = getItemsFromList('personagem-list');

        await setDoc(doc(db, 'profiles', user.uid), profileUpdates, { merge: true });
        if (Object.keys(authUpdates).length > 0) {
            await updateProfile(user, authUpdates);
        }

        handleCloseModal();
        loadAndDisplayProfileData(user.uid); 
    } catch (error) {
        console.error("Erro ao salvar o perfil: ", error);
        alert("Ocorreu um erro ao salvar seu perfil.");
    }
}

async function popularModalComDadosAtuais() {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");
    
    const docSnap = await getDoc(doc(db, 'profiles', user.uid));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('profile-pic-input').value = data.profilePicUrl || '';
        document.getElementById('banner-input').value = data.bannerUrl || '';
        document.getElementById('name-input').value = data.displayName || '';
        document.getElementById('bio-input').value = data.bio || '';

        const populateList = (listId, items) => {
            const listContainer = document.getElementById(listId);
            let ul = listContainer.querySelector('ul');
            if (!ul) { ul = document.createElement('ul'); listContainer.appendChild(ul); }
            ul.innerHTML = '';
            items?.forEach(itemName => {
                const li = document.createElement('li');
                li.textContent = itemName;
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.type = 'button';
                removeBtn.onclick = () => li.remove();
                li.appendChild(removeBtn);
                ul.appendChild(li);
            });
        };
        populateList('personagem-list', data.favoriteCharacters);
    }
}

function setupListInteraction(inputId, listId) {
    const input = document.getElementById(inputId);
    const listContainer = document.getElementById(listId);
    if (!input || !listContainer) return;
    let ul = listContainer.querySelector('ul');
    if (!ul) { ul = document.createElement('ul'); listContainer.appendChild(ul); }

    input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const itemName = input.value.trim();
        if (itemName) {
            const li = document.createElement('li');
            li.textContent = itemName;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.type = 'button';
            removeBtn.onclick = () => li.remove();
            li.appendChild(removeBtn);
            ul.appendChild(li);
            input.value = '';
        }
    });
}

async function exibirPersonagensFavoritos(characterNames) {
    const container = document.getElementById('favorite-characters-list');
    if (!container) return;
    if (!characterNames || characterNames.length === 0) {
        container.innerHTML = '<li class="empty-placeholder">Nenhum personagem favorito adicionado.</li>';
        return;
    }
    container.innerHTML = ''; 

    for (const name of characterNames) {
        try {   
            const url = `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(name)}&limit=1`;
            const response = await fetch(url);
            if (!response.ok) continue;

            const json = await response.json();
            const characterData = json.data[0]; 

            if (characterData) {
                const li = document.createElement('li');
                li.className = 'item-card';
                li.innerHTML = `
                    <img src="${characterData.images.jpg.image_url}" alt="${characterData.name}" class="item-img">
                    <span class="item-name">${characterData.name}</span>
                `;
                container.appendChild(li);
            }
        } catch (error) {
            console.error(`Falha ao buscar o personagem "${name}":`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

function processAndDisplayAnimeStats(animesSnapshot) {
    if (!animesSnapshot) return;

    let totalAnimes = animesSnapshot.size;
    let totalEpisodiosAssistidos = 0;
    let favoriteAnimesFound = 0;
    const genreCounts = {};

    animesSnapshot.forEach(doc => {
        const animeData = doc.data();
        
        const episodioAtual = animeData.episodioAtual;
        if (typeof episodioAtual === 'number') totalEpisodiosAssistidos += episodioAtual;
        
        if (animeData.favorito === true) {
            favoriteAnimesFound++;
            if (animeData.generos && typeof animeData.generos === 'string') {
                const genresArray = animeData.generos.split(',').map(g => g.trim());
                genresArray.forEach(genre => {
                    if (genre) genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                });
            }
        }
    });

    const tempoEstimadoMinutos = totalEpisodiosAssistidos * 24;

    document.getElementById('stat-total-animes').textContent = totalAnimes.toLocaleString('pt-BR');
    document.getElementById('stat-episodios-vistos').textContent = totalEpisodiosAssistidos.toLocaleString('pt-BR');
    document.getElementById('stat-tempo-estimado').textContent = `${tempoEstimadoMinutos.toLocaleString('pt-BR')} min`;

    const genreListContainer = document.getElementById('favorite-genres-list');
    if (genreListContainer) {
        const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
        const topGenres = sortedGenres.slice(0, 6).map(item => item[0]);
        genreListContainer.innerHTML = '';
        if (topGenres.length > 0) {
            topGenres.forEach(genreName => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fa-solid fa-tag genre-icon"></i><span>${genreName}</span>`;
                genreListContainer.appendChild(li);
            });
        } else {
            genreListContainer.innerHTML = '<li class="empty-placeholder">Favorite animes para vermos seus gostos!</li>';
        }
    }

    const favoriteAnimesContainer = document.getElementById('favorite-animes-list');
    if (favoriteAnimesContainer) {
        favoriteAnimesContainer.innerHTML = '';
        if (favoriteAnimesFound > 0) {
            animesSnapshot.forEach(doc => {
                const animeData = doc.data();
                if (animeData.favorito === true) {
                    const li = document.createElement('li');
                    li.className = 'item-card';
                    li.innerHTML = `<img src="${animeData.imagemCapa || '/src/assets/img/semimagem.jpg'}" alt="${animeData.nome}" class="item-img"><span class="item-name">${animeData.nome}</span>`;
                    favoriteAnimesContainer.appendChild(li);
                }
            });
        } else {
            favoriteAnimesContainer.innerHTML = '<li class="empty-placeholder">Nenhum anime favoritado ainda.</li>';
        }
    }
}