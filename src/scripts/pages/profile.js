import { auth, db } from '/src/scripts/config/firebase-init.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

const profileForm = document.getElementById('edit-profile-form');
const openModalButton = document.getElementById('edit-profile-btn');
const closeModalButton = document.getElementById('close-modal-btn');
const modalOverlay = document.getElementById('edit-modal');

function atualizarUsuarioUI(user) {
    if (!user) return;
    document.querySelectorAll(".userName").forEach(el => {
        el.textContent = user.displayName || "Usuário";
    });
    document.querySelectorAll(".userProfilePicture").forEach(el => {
        el.src = user.photoURL || "/src/assets/img/semimagem.jpg";
    });
}

function setupListInteraction(inputId, listId) {
    const input = document.getElementById(inputId);
    const listContainer = document.getElementById(listId);
    let ul = listContainer.querySelector('ul');
    if (!ul) {
        ul = document.createElement('ul');
        listContainer.appendChild(ul);
    }
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

async function salvarPerfil(event) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Você precisa estar logado!");

    const uid = user.uid;

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
            profileUpdates.userName = newUserName;
            authUpdates.displayName = newUserName;
        }
        
        profileUpdates.bio = document.getElementById('bio-input').value;

        const getItemsFromList = (listId) => {
            const items = [];
            document.querySelectorAll(`#${listId} li`).forEach(li => items.push(li.firstChild.textContent.trim()));
            return items;
        };
        profileUpdates.favoriteCharacters = getItemsFromList('personagem-list');

        await setDoc(doc(db, 'profiles', uid), profileUpdates, { merge: true });
        if (Object.keys(authUpdates).length > 0) {
            await updateProfile(user, authUpdates);
        }

        // alert("Perfil salvo com sucesso!");
        modalOverlay.classList.remove('visible');
        carregarPerfilCompleto();

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

        document.getElementById('name-input').value = data.userName || '';
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

async function exibirPersonagensFavoritos(characterNames) {
    const container = document.getElementById('favorite-characters-list');
    if (!container || !characterNames || characterNames.length === 0) {
        if(container) container.innerHTML = '<li class="empty-placeholder">Nenhum personagem favorito adicionado.</li>';
        return;
    }

    container.innerHTML = ''; 

    for (const name of characterNames) {
        try {    
            const url = `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(name)}&limit=1`;
            
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Erro na API Jikan para "${name}": ${response.statusText}`);
                continue;
            }

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
            } else {
                console.warn(`Personagem "${name}" não encontrado na API Jikan.`);
            }

        } catch (error) {
            console.error(`Falha ao buscar o personagem "${name}":`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

async function carregarPerfilCompleto() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("Nenhum usuário logado para carregar o perfil.");
            return;
        }
        
        atualizarUsuarioUI(user);

        const uid = user.uid;
        try {
            const profilePromise = getDoc(doc(db, 'profiles', uid));
            const animesPromise = getDocs(collection(db, 'users', uid, 'animes'));
            const [profileDocSnap, animesSnapshot] = await Promise.all([profilePromise, animesPromise]);

            if (profileDocSnap.exists()) {
                const data = profileDocSnap.data();
                
                document.querySelector('.userName').textContent = data.userName || user.displayName;
                document.querySelector('.bio').textContent = data.bio || 'Adicione uma bio...';
                if (data.bannerUrl) document.querySelector('.banner-img').src = data.bannerUrl;
                if (data.profilePicUrl) document.querySelector('.userProfilePicture').src = data.profilePicUrl;

                if (data.favoriteCharacters) {
                    exibirPersonagensFavoritos(data.favoriteCharacters);
                }

            } else {
                exibirPersonagensFavoritos([]);
            }

            

            const genreCounts = {};
            let favoriteAnimesFound = 0; 

            animesSnapshot.forEach(doc => {
                const animeData = doc.data();
                
                if (animeData.favorito === true) {
                    favoriteAnimesFound++;

                    if (animeData.generos && typeof animeData.generos === 'string') {
                        const genresArray = animeData.generos.split(',').map(g => g.trim());
                        
                        genresArray.forEach(genre => {
                            if (genre) {
                                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                            }
                        });
                    }
                }
            });

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

        
            let totalAnimes = animesSnapshot.size;
            let totalEpisodiosAssistidos = 0;
            animesSnapshot.forEach(doc => {
                const episodioAtual = doc.data().episodioAtual;
                if (typeof episodioAtual === 'number') totalEpisodiosAssistidos += episodioAtual;
            });
            const tempoEstimadoMinutos = totalEpisodiosAssistidos * 24;
            document.getElementById('stat-total-animes').textContent = totalAnimes.toLocaleString('pt-BR');
            document.getElementById('stat-episodios-vistos').textContent = totalEpisodiosAssistidos.toLocaleString('pt-BR');
            document.getElementById('stat-tempo-estimado').textContent = `${tempoEstimadoMinutos.toLocaleString('pt-BR')} min`;

        } catch(error) {
            console.error("Erro ao carregar dados do perfil:", error);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    if (!openModalButton) {
        console.error('Botão de abrir modal #edit-profile-btn não foi encontrado. O modal não funcionará.');
        return;
    }

    carregarPerfilCompleto();

    setupListInteraction('personagem-search-input', 'personagem-list');
    
    openModalButton.addEventListener('click', async () => {
        if (!auth.currentUser) {
            alert("Por favor, faça login para editar seu perfil.");
            return;
        }

        try {
            await popularModalComDadosAtuais();
            modalOverlay.classList.add('visible');
        } catch (error) {
            console.error("Falha ao preparar o modal para edição:", error);
            alert("Não foi possível carregar seus dados para edição. Verifique sua conexão e tente novamente.");
        }
    });

    closeModalButton.addEventListener('click', () => {
        modalOverlay.classList.remove('visible');
    });
    
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.classList.remove('visible');
        }
    });

    profileForm.addEventListener('submit', salvarPerfil);
});