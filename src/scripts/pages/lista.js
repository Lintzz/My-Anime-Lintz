import { auth, db } from '/src/scripts/config/firebase-init.js';

import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

// Seletores de Elementos do DOM
const toggleButton = document.getElementById('toggleFiltro');
const botaoGrade = document.getElementById('botao-grade');
const botaoLista = document.getElementById('botao-lista');
const listaAnimes = document.getElementById('minha-lista');
const botaoAdicionar = document.getElementById('botao-adicionar');

const formPesquisa = document.getElementById('form-pesquisa')
const aplicarFiltrosBtn = document.getElementById('aplicarFiltros');
const limparFiltrosBtn = document.getElementById('limparFiltros');

const modalContainerEl = document.getElementById('meuModalDinamico');
const modalTitleEl = document.getElementById('modal-title');
const modalMessageEl = document.getElementById('modal-message');
const modalButtonsEl = document.getElementById('modal-buttons');

// Variáveis de Estado Global
let usuarioAtual = null;
let nomes = [];
let animesData = [];
let nomesCarregados = false;
let listaCompletaFirestore = []; 
let unsubscribeAnimes;

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioAtual = user;

        const ordenacaoPadrao = localStorage.getItem('list_default_sort') || 'recent';
        const filtroPadrao = localStorage.getItem('list_default_filter') || 'todos';

        const radioOrdem = document.querySelector(`input[name="ordem"][value="${ordenacaoPadrao}"]`);
        if (radioOrdem) {
            radioOrdem.checked = true;
        }

        const radioAndamento = document.querySelector(`input[name="seu_andamento"][value="${filtroPadrao}"]`);
        if (radioAndamento) {
            radioAndamento.checked = true;
        }

        carregarLista();
    } else {
        usuarioAtual = null;

        if (unsubscribeAnimes) {
            //console.log("Usuário deslogado. Parando de ouvir as atualizações da lista.");
            unsubscribeAnimes();
        }

        if(listaAnimes) listaAnimes.innerHTML = '<p class="carregando-msg">Você precisa fazer login para ver sua lista.</p>';
        window.location.href = "/src/pages/login.html"; 
    }
});

// carregando dados do firebase
function carregarLista() {
    if (!usuarioAtual) return;

    listaAnimes.innerHTML = '<p class="carregando-msg">Carregando sua lista...</p>';

    const animesCollectionRef = collection(db, "users", usuarioAtual.uid, "animes");
    const q = query(animesCollectionRef, orderBy("criadoEm", "desc"));
    
    unsubscribeAnimes = onSnapshot(q, (snapshot) => {
        listaCompletaFirestore = []; 
        snapshot.forEach((doc) => {
            listaCompletaFirestore.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarListaFiltradaEOrdenada();
    }, (error) => {
        console.error("Erro ao carregar a lista de animes: ", error);
    });
}

// FILTRO
function renderizarListaFiltradaEOrdenada() {
    const isFavoritos = document.querySelector('input[name="favoritos"]').checked;
    const isWishlist = document.querySelector('input[name="wishlist"]').checked;
    const statusSerie = document.querySelector('input[name="status_serie"]:checked').value;
    const seuAndamento = document.querySelector('input[name="seu_andamento"]:checked').value;
    const ordem = document.querySelector('input[name="ordem"]:checked').value;

    let animesParaExibir = [...listaCompletaFirestore];

    if (isFavoritos) {
        animesParaExibir = animesParaExibir.filter(s => s.favorito === true);
    }
    if (isWishlist) {
        animesParaExibir = animesParaExibir.filter(s => s.episodioAtual === 0);
    }

    switch(statusSerie) {
        case 'acabou':
            animesParaExibir = animesParaExibir.filter(s => s.status === 'Finished Airing');
            break;
        case 'esta_lancando':
            animesParaExibir = animesParaExibir.filter(s => s.status === 'Currently Airing');
            break;
    } 

    switch(seuAndamento) {
        case 'terminei':
            animesParaExibir = animesParaExibir.filter(s => s.episodioAtual === s.totalEpisodios && s.totalEpisodios > 0);
            break;
        case 'to_vendo':
            animesParaExibir = animesParaExibir.filter(s => s.episodioAtual > 0 && s.episodioAtual < s.totalEpisodios);
            break; 
    }

    switch(ordem) {
        case 'az':
            animesParaExibir.sort((a, b) => a.nome.localeCompare(b.nome));
            break;
        case 'za':
            animesParaExibir.sort((a, b) => b.nome.localeCompare(a.nome));
            break;
    }

    exibirAnimes(animesParaExibir); 
}

// Limpa a Ul atual e renderiza um card para cada anime da lista fornecida.
function exibirAnimes(animes) {
    listaAnimes.innerHTML = '';
    if (animes.length === 0) {
        listaAnimes.innerHTML = '<p class="lista-vazia-msg">Nenhum anime encontrado.</p>';
        return;
    }
    animes.forEach(anime => CriarCardAnime(anime));
}

// Cria o card de anime na tela
function CriarCardAnime(anime) {
  const episodioFormatado = anime.episodioAtual.toString().padStart(2, '0');
  const totalFormatado = anime.totalEpisodios.toString().padStart(2, '0');

  let scoreFormatado = "N/A"; 

  if (anime.score && anime.score !== 'null') {
      
      const scoreNumerico = parseFloat(anime.score);
      
      scoreFormatado = scoreNumerico.toFixed(1);
  }

  const card = document.createElement("li");
  card.classList.add("card");
  card.dataset.id = anime.id;

  card.innerHTML = `
    <div class="card-fav">
      <button class="favorito ${anime.favorito ? 'favoritado' : ''}">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"></path>
        </svg>
      </button>
    </div>
    <div class="card-capa">
      <p class="score">${scoreFormatado}</p>
      <img src="${anime.imagemCapa || 'img/capa_padrao.webp'}" alt="Capa de ${anime.nome}">
      <div class="corstatus" style="background-color: ${definirCorStatus(anime.episodioAtual, anime.totalEpisodios)};"></div>
    </div>
    <div class="card-nome">
      <p>${anime.nome}</p>
    </div>
    <div class="card-episodes">
      <p>${episodioFormatado}/${totalFormatado}</p>
    </div>
    <div class="card-edit">
      <div class="menu-acoes">
        <button class="botao-mais">⋮</button>
        <div class="dropdown-edit">
          <button class="btn-editar">Editar</button>
          <button class="btn-apagar">Apagar</button>
        </div>
      </div>
    </div>
  `;
  
  listaAnimes.appendChild(card);
}

// Carrega e filtra nomes do animes_completos.json
async function carregarAnimesParaAutocomplete() {
  try {
    const response = await fetch('/src/assets/data/animes_completos.json');
    if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
    
    const todosOsAnimes = await response.json();

    const tiposDesejados = ['TV', 'ONA'];

    const animesFiltrados = todosOsAnimes.filter(anime => 
      tiposDesejados.includes(anime.type)
    );

    animesData = animesFiltrados; 
    nomes = animesFiltrados.map(anime => anime.name);
    
    nomesCarregados = true;

    //console.log(`Autocomplete carregado com ${nomes.length} animes (apenas TV e ONA).`);

  } catch (error) {
    
    console.error("Erro ao carregar e filtrar animes.json:", error);
  }
}

// Define a cor da barra de status ao renderizar
function definirCorStatus(atual, total) {
  atual = Number(atual);
  total = Number(total);
  if (atual === 0) return "gray";
  if (atual > 0 && atual < total) return "yellow";
  if (atual === total) return "green";
  return "transparent";
};

// Atualiza a cor da barra de status durante a edição
function atualizarCorStatus(atual, total, corstatus) {
  if (atual === 0) {
    corstatus.style.backgroundColor = "gray";
  } else if (atual > 0 && atual < total) {
    corstatus.style.backgroundColor = "yellow";
  } else if (atual === total) {
    corstatus.style.backgroundColor = "green";
  } else {
    corstatus.style.backgroundColor = "transparent";
  }
};

// Restaura os botões de editar/apagar após edição/cancelamento
function restaurarBotoes(card) {
    const editDiv = card.querySelector(".card-edit");
    editDiv.innerHTML = `
        <div class="menu-acoes">
            <button class="botao-mais">⋮</button>
            <div class="dropdown-edit">
                <button>Editar</button>
                <button>Apagar</button>
            </div>
        </div>
    `;
};

// Modal confirm/alert
function showModal({ title, message, buttons = [] }) {
  modalButtonsEl.innerHTML = ''; 

  modalTitleEl.textContent = title;
  modalMessageEl.textContent = message;

  buttons.forEach(buttonInfo => {
    const button = document.createElement('button');
    button.textContent = buttonInfo.text;
    button.className = buttonInfo.class; 
    
    button.addEventListener('click', () => {
      closeModal(); 
      if (buttonInfo.onClick) {
        buttonInfo.onClick(); 
      }
    });
    modalButtonsEl.appendChild(button);
  });

  modalContainerEl.classList.add('visible');
}

function closeModal() {
  modalContainerEl.classList.remove('visible');
}

function showAlert(message, title = 'Aviso') {
  showModal({
    title,
    message,
    buttons: [
      { text: 'OK', class: 'modal-button button-secondary', onClick: () => {} }
    ]
  });
}

function showConfirm(message, title = 'Confirmação') {
  return new Promise(resolve => {
    showModal({
      title,
      message,
      buttons: [
        { text: 'Cancelar', class: 'modal-button button-secondary', onClick: () => resolve(false) },
        { text: 'Confirmar', class: 'modal-button button-destructive', onClick: () => resolve(true) }
      ]
    });
  });
}

/* 6. EVENT LISTENERS */
document.addEventListener("DOMContentLoaded", () => {

  carregarAnimesParaAutocomplete(); 

  // BOTAO ADICIONAR 
  botaoAdicionar.addEventListener("click", () => {
    let imagemCapa = '';
    // listaAnimes.innerHTML = ''; se quiser sumir com a lista quando adicionar 
    if (!nomesCarregados) {
      showAlert("Aguarde, carregando lista de animes...");
      return;
    }
    if (document.querySelector(".novo-card")) return;

    const novoCard = document.createElement("li");
    novoCard.classList.add("card", "novo-card");
    novoCard.innerHTML = `
      <div class="card-fav">
          <button class="favorito">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"></path>
          </svg>
          </button>
      </div>
      <div class="card-capa">
          <div class="semImagem"></div>
          <div class="corstatus"></div>
      </div>
      <div class="card-nome">
          <div class="dropdown-add-novo">
              <input type="text" class="input-nome-novo" placeholder="Nome do anime">
              <div class="arrow" id="arrow">▼</div>
              <div class="lista-dropdown-add"></div>
          </div>
      </div>
      <div class="card-episodes">
          <div class="episodios-editor">
              <button class="menos">−</button>
              <input type="number" class="input-ep-novo" value="0" min="0">
              <button class="mais">+</button>
              <span>/00</span>
          </div>
      </div>
      <div class="card-edit">
          <button id="botao-adicionar-lista" class="salvar-novo">Salvar</button>
          <button class="cancelar-novo">Cancelar</button>
      </div>
      `;
    listaAnimes.insertBefore(novoCard, listaAnimes.firstChild);

    const inputNome = novoCard.querySelector(".input-nome-novo");
    const listaDropdown = novoCard.querySelector(".lista-dropdown-add");
    const dropdown = novoCard.querySelector(".dropdown-add-novo");
    const inputEp = novoCard.querySelector(".input-ep-novo");
    const corstatus = novoCard.querySelector(".corstatus");

    inputNome.addEventListener("input", () => {
      const filtro = inputNome.value.toLowerCase();
      listaDropdown.innerHTML = "";
      const filtrados = nomes.filter(nome => typeof nome === "string" && nome.toLowerCase().includes(filtro));

      filtrados.forEach(nome => {
        const item = document.createElement("div");
        item.textContent = nome;
        item.addEventListener("click", () => {
          inputNome.value = nome;
          fecharDropdown();

          fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(nome)}&limit=1`)
            .then(res => res.json())
            .then(data => {
              const capaDiv = novoCard.querySelector(".card-capa");

              if (data.data && data.data.length > 0) {
                const animeData = data.data[0];
                imagemCapa = animeData.images.jpg.image_url;
                
                const totalEpisodios = animeData.episodes;
                const statusAnime = animeData.status;
                const generos = animeData.genres.map(g => g.name).join(', ');
                const score = animeData.score;

                novoCard.dataset.totalEpisodios = totalEpisodios || 0; 
                novoCard.dataset.status = statusAnime;
                novoCard.dataset.generos = generos;
                novoCard.dataset.score = score;

                capaDiv.innerHTML = `<img src="${imagemCapa}" alt="Capa de ${nome}">`;
                capaDiv.appendChild(corstatus);

                const spanTotal = novoCard.querySelector(".card-episodes span");
                spanTotal.textContent = "/" + (totalEpisodios || '??').toString().padStart(2, '0');
                
                inputEp.value = 0;
                atualizarCorStatus(0, totalEpisodios || 0, corstatus);

              } else {
                capaDiv.innerHTML = `<div class="semImagem">Não encontrado</div>`;
                capaDiv.appendChild(corstatus);
                novoCard.dataset.totalEpisodios = 0;
              }
            })
            .catch(err => {
              console.error("Erro ao buscar imagem:", err);
              novoCard.dataset.totalEpisodios = 0;
            });
        });

        listaDropdown.appendChild(item);
      });

      if (filtrados.length) abrirDropdown();
      else fecharDropdown();
    });

    inputNome.addEventListener("click", (e) => { e.stopPropagation(); if (listaDropdown.style.display === "block") fecharDropdown(); else inputNome.dispatchEvent(new Event('input')); });
    document.addEventListener("click", (e) => { if (!dropdown.contains(e.target)) fecharDropdown(); });
    function abrirDropdown() { listaDropdown.style.display = 'block'; dropdown.classList.add('open'); }
    function fecharDropdown() { listaDropdown.style.display = 'none'; dropdown.classList.remove('open'); }

    novoCard.querySelector(".mais").addEventListener("click", () => {
      const totalEps = Number(novoCard.dataset.totalEpisodios) || 0;
      let valorAtual = parseInt(inputEp.value);
      if (valorAtual < totalEps) {
          inputEp.value = valorAtual + 1;
          atualizarCorStatus(Number(inputEp.value), totalEps, corstatus);
      }
    });

    novoCard.querySelector(".menos").addEventListener("click", () => {
      const totalEps = Number(novoCard.dataset.totalEpisodios) || 0;
      inputEp.value = Math.max(0, parseInt(inputEp.value) - 1);
      atualizarCorStatus(Number(inputEp.value), totalEps, corstatus);
    });

    inputEp.addEventListener("input", () => {
      const totalEps = Number(novoCard.dataset.totalEpisodios) || 0;
      let val = Number(inputEp.value);
      if (val < 0) val = 0;
      if (totalEps > 0 && val > totalEps) val = totalEps;
      inputEp.value = val;
      atualizarCorStatus(val, totalEps, corstatus);
    });
    
    novoCard.querySelector(".cancelar-novo").addEventListener("click", () => {
      novoCard.remove();    
    });

    novoCard.querySelector(".salvar-novo").addEventListener("click", async () => {
      const nomeInput = inputNome.value.trim();
      const episodioAtual = Number(inputEp.value);

      if (!nomeInput) { showAlert("Preencha o nome do anime"); return; }
      if (!usuarioAtual) { showAlert("Erro: Usuário não está logado. Faça login novamente."); return; }

      const nomeCorretoDoAnime = nomes.find(n => n.toLowerCase() === nomeInput.toLowerCase());

      if (!nomeCorretoDoAnime) {
        showAlert("Anime não encontrado! Por favor, insira um nome de anime válido da lista");
        return; 
      }

      const totalEps = Number(novoCard.dataset.totalEpisodios) || 0;
      const status = novoCard.dataset.status || 'Status desconhecido';
      const generos = novoCard.dataset.generos || 'Gêneros desconhecidos';
      const score = novoCard.dataset.score;

      const animeParaSalvar = {
        userId: usuarioAtual.uid,
        nome: nomeCorretoDoAnime,
        episodioAtual: episodioAtual,
        totalEpisodios: totalEps,
        imagemCapa: imagemCapa || 'img/capa_padrao.webp',
        favorito: false,
        status: status,  
        generos: generos,
        score: score,
        criadoEm: new Date()
      };

      try {
        const docRef = await addDoc(collection(db, "users", usuarioAtual.uid, "animes"), animeParaSalvar);
        novoCard.classList.remove("novo-card");
        novoCard.dataset.id = docRef.id;
      } catch (error) {
        console.error("Erro ao salvar o anime: ", error);
      }
    });
  });
  
  // Favoritar/Editar/Apagar
  listaAnimes.addEventListener('click', async (event) => {
    // Verifica se o clique foi no botão "Apagar"
    if (event.target.tagName === 'BUTTON' && event.target.textContent === 'Apagar') {
        const card = event.target.closest('.card');
        const docId = card?.dataset.id;
        const animeNome = card.querySelector('.card-nome p')?.textContent || "este item";

        if (!docId) return;

        // 1. Chama nosso novo modal e ESPERA (await) pela resposta
        //    Isso só funciona porque a função do listener é 'async'
        const foiConfirmado = await showConfirm(`Tem certeza que deseja apagar "${animeNome}" da sua lista?`);

        // 2. Se a resposta for 'true', executa a exclusão
        if (foiConfirmado) {
            console.log("Usuário confirmou! Apagando o item...");
            const docRef = doc(db, "users", usuarioAtual.uid, "animes", docId);
            try {
                await deleteDoc(docRef);
                // Opcional: pode mostrar um alerta de sucesso
                showAlert("Item apagado com sucesso!");
            } catch (error) {
                console.error("Erro ao apagar o anime: ", error);
                showAlert("Não foi possível apagar o item.");
            }
        } else {
            console.log("Usuário cancelou a exclusão.");
        }
    }


    // Lógica para o botão "Favoritar"
    if (event.target.closest('.favorito')) {
        const card = event.target.closest('.card');
        const docId = card?.dataset.id;
        
        if (!docId) return;

        const botaoFavorito = event.target.closest('.favorito');
        const novoEstadoFavorito = !botaoFavorito.classList.contains('favoritado');
        
        const docRef = doc(db, "users", usuarioAtual.uid, "animes", docId);
        const dadosParaAtualizar = { favorito: novoEstadoFavorito };

        try {
            await updateDoc(docRef, dadosParaAtualizar);
        } catch (error) {
            console.error("Erro ao favoritar o anime: ", error);
            showAlert("Não foi possível atualizar o status de favorito.");
        }
    }

    // botão "Editar"
    if (event.target.textContent === "Editar" && event.target.parentElement.classList.contains("dropdown-edit")) {
      const card = event.target.closest(".card");

      // Nome
      const nomeDiv = card.querySelector(".card-nome");
      const nomeTexto = nomeDiv.querySelector("p").textContent;
      nomeDiv.innerHTML = `<input type="text" class="edit-nome" value="${nomeTexto}">`;

      // Episódios
      const epDiv = card.querySelector(".card-episodes");
      const [assistidos, total] = epDiv.textContent.trim().split("/").map(Number);
      epDiv.innerHTML = `
          <div class="episodios-editor">
              <button class="menos">−</button>
              <input type="number" value="${assistidos}" min="0" max="${total}" class="input-ep">
              <button class="mais">+</button>
              <span>/ ${total}</span>
          </div>
      `;

      // Substituir por Salvar e Cancelar
      const editDiv = card.querySelector(".card-edit");
      editDiv.innerHTML = `
          <button class="edit-salvar">Salvar</button>
          <button class="edit-cancelar">Cancelar</button>
      `;

      const inputEp = epDiv.querySelector(".input-ep");
      const corstatus = card.querySelector(".corstatus");

      // Atualiza cor ao digitar
      inputEp.addEventListener("input", () => {
          let val = parseInt(inputEp.value) || 0;
          if (val < 0) val = 0;
          if (val > total) val = total;
          inputEp.value = val;
          atualizarCorStatus(val, total, corstatus);
      });

      epDiv.querySelector(".mais").addEventListener("click", () => {
          let val = parseInt(inputEp.value) || 0;
          if (val < total) {
              inputEp.value = val + 1;
              atualizarCorStatus(val + 1, total, corstatus);
          }
      });

      epDiv.querySelector(".menos").addEventListener("click", () => {
          let val = parseInt(inputEp.value) || 0;
          if (val > 0) {
              inputEp.value = val - 1;
              atualizarCorStatus(val - 1, total, corstatus);
          }
      });

      // Botão salvar
      editDiv.querySelector(".edit-salvar").addEventListener("click", async () => {
          const card = editDiv.closest(".card");
          const docId = card.dataset.id;

          if (!docId) {
            showAlert("Erro: Não foi possível encontrar o ID do item.");
            return;
          }

          const novoNome = card.querySelector(".edit-nome").value;
          const novoEp = Number(card.querySelector(".input-ep").value);

          const docRef = doc(db, "users", usuarioAtual.uid, "animes", docId);

          const dadosParaAtualizar = {
            nome: novoNome,
            episodioAtual: novoEp
          };

          try {
            await updateDoc(docRef, dadosParaAtualizar);
              
          } catch (error) {
            console.error("Erro ao atualizar o anime: ", error);
            showAlert("Não foi possível salvar as alterações. Verifique o console.");
          }
      });

      // Botão  cancelar
      editDiv.querySelector(".edit-cancelar").addEventListener("click", () => {
          nomeDiv.innerHTML = `<p>${nomeTexto}</p>`;
          epDiv.innerHTML = `<p>${assistidos}/${total}</p>`;
          atualizarCorStatus(assistidos, total, corstatus);
          restaurarBotoes(card);
      });
    }
  });

  // Modo List
  botaoLista.addEventListener('click', function() {
      listaAnimes.classList.remove('view-grid');
      listaAnimes.classList.add('view-list');
      botaoLista.classList.add('active'); 
      botaoGrade.classList.remove('active'); 
  });

  // Modo Grid
  botaoGrade.addEventListener('click', function() {
      listaAnimes.classList.remove('view-list');
      listaAnimes.classList.add('view-grid');
      botaoGrade.classList.add('active'); 
      botaoLista.classList.remove('active');
  });

  // Filtro modal
  toggleButton.addEventListener('click', function(event) {
      const dropdownMenu = document.getElementById('dropdownConteudoFiltro').parentElement; 
      dropdownMenu.classList.toggle('aberto');
      event.stopPropagation(); 
  });
  
  document.addEventListener('click', function(event) {
      const dropdownMenu = document.getElementById('dropdownConteudoFiltro').parentElement; 
      if (dropdownMenu.classList.contains('aberto') && !dropdownMenu.contains(event.target)) {
          dropdownMenu.classList.remove('aberto');
      }
  });

  //Aplicar filtro
  aplicarFiltrosBtn.addEventListener('click', () => {
      renderizarListaFiltradaEOrdenada();

      const dropdownMenu = document.getElementById('dropdownConteudoFiltro').parentElement;
      dropdownMenu.classList.remove('aberto');
  });

  // Limpar filtro
  limparFiltrosBtn.addEventListener('click', () => {
    //console.log("Limpando filtros e re-renderizando a lista...");

    const favCheckbox = document.querySelector('input[name="favoritos"]');
    if (favCheckbox) favCheckbox.checked = false;

    const wishlistCheckbox = document.querySelector('input[name="wishlist"]');
    if (wishlistCheckbox) wishlistCheckbox.checked = false;

    const statusTodos = document.querySelector('input[name="status_serie"][value="todos"]');
    if (statusTodos) statusTodos.checked = true;

    const andamentoTodos = document.querySelector('input[name="seu_andamento"][value="todos"]');
    if (andamentoTodos) andamentoTodos.checked = true;
    
    const ordemPadrao = document.querySelector('input[name="ordem"][value="adicionado"]');
    if (ordemPadrao) ordemPadrao.checked = true;

    renderizarListaFiltradaEOrdenada();

    const dropdownMenu = document.getElementById('dropdownConteudoFiltro')?.parentElement;
    if (dropdownMenu) {
        dropdownMenu.classList.remove('aberto');
    }
  });

  // botao ⋮
  document.addEventListener('click', async (event) => {
        
    document.querySelectorAll(".dropdown-edit").forEach(menu => {
      if (menu.classList.contains('mostrar') && !menu.contains(event.target) && !menu.previousElementSibling?.contains(event.target)) {
          menu.classList.remove("mostrar");
      }
    }); 

    if (event.target.classList.contains("botao-mais")) {
      const dropdown = event.target.nextElementSibling;
      if (dropdown) {
          dropdown.classList.toggle("mostrar");
      }
      event.stopPropagation();
    }

  });

  // Barra Pesquisa
  formPesquisa.addEventListener('submit', function(event){
    event.preventDefault(); 

    const termoBusca = document.getElementById('campo-pesquisa').value.toLowerCase();
    const itens = document.querySelectorAll('.card');

    itens.forEach(function(item){
      const nomeItem = item.querySelector('.card-nome p').textContent.toLowerCase();

      if (nomeItem.includes(termoBusca)) {
        item.classList.remove('escondido');
      } else {
        item.classList.add('escondido');
      }

    })


  });

  modalContainerEl.addEventListener('click', e => {
    if (e.target === modalContainerEl) {
      closeModal();
    }
  });

});



















































