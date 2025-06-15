// IMPORTAÇÕES
import { auth, db } from '/js/firebase-init.js';

import { 
    onAuthStateChanged,
    signOut,
    updateProfile, 
    EmailAuthProvider, 
    reauthenticateWithCredential, 
    updatePassword,
    verifyBeforeUpdateEmail,
    deleteUser 
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { collection, getDocs, writeBatch, doc } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";


// Referências da seção de Perfil
const displayNameInput = document.getElementById('displayName');
const photoURLInput = document.getElementById('photoURL');
const saveProfileButton = document.getElementById('saveProfileButton');
const profileStatus = document.getElementById('profileStatus');

// Referências da seção de Segurança
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordStatus = document.getElementById('passwordStatus');

// Referências da seção de Alterar E-mail
const currentEmailDisplay = document.getElementById('currentEmailDisplay');
const newEmailInput = document.getElementById('newEmail');
const changeEmailBtn = document.getElementById('changeEmailBtn');
const emailStatus = document.getElementById('emailStatus');

// Referências da Zona de Perigo
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const deleteStatus = document.getElementById('deleteStatus');

// Referências do Modal
const modalOverlay = document.getElementById('customModalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalInputWrapper = document.getElementById('modalInputWrapper');
const modalInput = document.getElementById('modalInput');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

// Temas
const accentColorSelect = document.getElementById('accentColor');
const themeSelector = document.getElementById('themeSelector');
const defaultViewSelect = document.getElementById('defaultView');

// ProgressBar/Score
const toggleProgressBar = document.getElementById('toggleProgressBar');
const toggleScore = document.getElementById('toggleScore');

// lista filtro
const defaultSortSelect = document.getElementById('defaultSort');
const defaultFilterSelect = document.getElementById('defaultFilter');

// apagar todos cards
const deleteAllItemsBtn = document.getElementById('deleteAllItemsBtn');
const deleteAllStatus = document.getElementById('deleteAllStatus');

// Modal perfil
const botaoPerfil = document.querySelector('.button-perfil');
const perfil = document.querySelector('.perfil-dropdown');

// atualizar nome e foto 
const userNameElements = document.querySelectorAll(".userName");
const userImageElements = document.querySelectorAll(".userProfilePicture");

//botao sair
const botaoSair = document.getElementById('btn-sair');


let currentUser = null;

let resolveModalPromise; 

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        atualizarUsuarioUI(user);
    
        displayNameInput.value = user.displayName || '';
        photoURLInput.value = user.photoURL || '';
        displayNameInput.disabled = false;
        photoURLInput.disabled = false;
        saveProfileButton.disabled = false;
    
        currentEmailDisplay.textContent = user.email;
        newEmailInput.disabled = false;
        changeEmailBtn.disabled = false;

        const providerId = user.providerData[0]?.providerId;
        if (providerId === 'password') {
            currentPasswordInput.disabled = false;
            newPasswordInput.disabled = false;
            confirmNewPasswordInput.disabled = false;
            changePasswordBtn.disabled = false;
            deleteAccountBtn.disabled = false;
        } else {
            passwordStatus.textContent = `Login com ${providerId}. Troca de senha não aplicável.`;
            emailStatus.textContent = `Login com ${providerId}. Troca de e-mail não aplicável.`;
            deleteStatus.textContent = `A exclusão de conta via senha não é aplicável para login com ${providerId}.`;

        }

    } else {
        currentUser = null;
        profileStatus.textContent = 'Você precisa fazer login para ver suas configurações.';
        displayNameInput.disabled = true;
        photoURLInput.disabled = true;
        saveProfileButton.disabled = true;
    }
});

function showModal() {
    modalOverlay.classList.add('visible');
}

function hideModal() {
    modalOverlay.classList.remove('visible');
    modalInput.value = '';
    modalInputWrapper.style.display = 'none';
}

// Função para diálogos de confirmação 
function showConfirmationModal(title, body) {
    modalTitle.textContent = title;
    modalBody.textContent = body;
    modalInputWrapper.style.display = 'none';
    showModal();
    
    return new Promise(resolve => {
        resolveModalPromise = resolve;
    });
}

// Função para pedir a senha
function showPasswordPromptModal() {
    modalTitle.textContent = 'Confirmação de Segurança';
    modalBody.textContent = 'Para prosseguir com esta ação, por favor, digite sua senha atual.';
    modalInputWrapper.style.display = 'block';
    showModal();
    modalInput.focus();

    return new Promise(resolve => {
        resolveModalPromise = resolve;
    });
}

// FUNÇÃO PARA CARREGAR AS CONFIGURAÇÕES SALVAS NO FORMULÁRIO
function loadSettingsAparencia() {
    const savedTheme = localStorage.getItem('app_theme') || 'dark';
    const savedColor = localStorage.getItem('app_accent_color') || '#6a3de8';
    const savedView = localStorage.getItem('app_list_view') || 'grid';

    const showProgressBar = JSON.parse(localStorage.getItem('show_progress_bar')) ?? true;
    const showScore = JSON.parse(localStorage.getItem('show_score')) ?? true;

    const savedSort = localStorage.getItem('list_default_sort') || 'recent'; 
    const savedFilter = localStorage.getItem('list_default_filter') || 'todos';  

    themeSelector.value = savedTheme;
    accentColorSelect.value = savedColor;
    defaultViewSelect.value = savedView;

    toggleProgressBar.checked = showProgressBar;
    toggleScore.checked = showScore;

    defaultSortSelect.value = savedSort;
    defaultFilterSelect.value = savedFilter;
}

function atualizarUsuarioUI(user) {
  userNameElements.forEach(el => {
    el.textContent = user.displayName || "";
  });

  userImageElements.forEach(el => {
    el.src = user.photoURL || "/assets/img/semimagem.jpg";
  });
}


//  SALVAR PERFIL 
saveProfileButton.addEventListener('click', async () => {
    if (!currentUser) return;

    const newDisplayName = displayNameInput.value;
    const newPhotoURL = photoURLInput.value;

    profileStatus.textContent = 'Salvando...';
    profileStatus.style.color = '#333';
    saveProfileButton.disabled = true;

    try {
        await updateProfile(currentUser, {
            displayName: newDisplayName,
            photoURL: newPhotoURL
        });
        profileStatus.textContent = 'Perfil salvo com sucesso!';
        profileStatus.style.color = 'green';
    } catch (error) {
        console.error("Erro ao atualizar o perfil:", error);
        profileStatus.textContent = `Erro: ${error.message}`;
        profileStatus.style.color = 'red';
    } finally {
        saveProfileButton.disabled = false;
    }
});

//  ALTERAR SENHA 
changePasswordBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    passwordStatus.textContent = '';
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        passwordStatus.textContent = 'Por favor, preencha todos os campos.';
        passwordStatus.style.color = 'red';
        return;
    }
    if (newPassword !== confirmNewPassword) {
        passwordStatus.textContent = 'A nova senha e a confirmação não correspondem.';
        passwordStatus.style.color = 'red';
        return;
    }
    if (newPassword.length < 6) {
        passwordStatus.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
        passwordStatus.style.color = 'red';
        return;
    }

    passwordStatus.textContent = 'Verificando...';
    passwordStatus.style.color = '#333';
    changePasswordBtn.disabled = true;

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);

        passwordStatus.textContent = 'Senha alterada com sucesso!';
        passwordStatus.style.color = 'green';
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';

    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        switch (error.code) {
            case 'auth/wrong-password':
                passwordStatus.textContent = 'A senha atual está incorreta.';
                break;
            case 'auth/weak-password':
                passwordStatus.textContent = 'A nova senha é muito fraca.';
                break;
            case 'auth/requires-recent-login':
                passwordStatus.textContent = 'Sessão expirada. Faça login novamente para continuar.';
                break;
            default:
                passwordStatus.textContent = 'Ocorreu um erro. Tente novamente.';
        }
        passwordStatus.style.color = 'red';
    } finally {
        changePasswordBtn.disabled = false;
    }
});

// Evento para alterar o e-mail
changeEmailBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    
    emailStatus.textContent = '';
    const newEmail = newEmailInput.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
        emailStatus.textContent = 'Por favor, insira um formato de e-mail válido.';
        emailStatus.style.color = 'red';
        return;
    }

    emailStatus.textContent = 'Enviando e-mail de confirmação...';
    emailStatus.style.color = '#333';
    changeEmailBtn.disabled = true;

    try {
        await verifyBeforeUpdateEmail(currentUser, newEmail);

        emailStatus.textContent = 'Link enviado! Verifique sua nova caixa de e-mail para finalizar a alteração.';
        emailStatus.style.color = 'green';
        newEmailInput.value = '';

    } catch (error) {
        console.error("Erro ao enviar e-mail de verificação:", error);
        switch (error.code) {
            case 'auth/email-already-in-use':
                emailStatus.textContent = 'Este e-mail já está em uso por outra conta.';
                break;
            case 'auth/requires-recent-login':
                emailStatus.textContent = 'Sua sessão é muito antiga. Por favor, faça login novamente para continuar.';
                break;
            default:
                emailStatus.textContent = 'Ocorreu um erro. Tente novamente.';
        }
        emailStatus.style.color = 'red';
    } finally {
        changeEmailBtn.disabled = false;
    }
});

// Evento para DELETAR a conta
deleteAccountBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    deleteStatus.textContent = '';

    const firstConfirm = await showConfirmationModal(
        "Apagar Conta",
        "Você tem certeza ABSOLUTA que quer apagar sua conta? Esta ação não pode ser desfeita."
    );
    if (!firstConfirm) return;

    const secondConfirm = await showConfirmationModal(
        "Último Aviso",
        "Esta é sua última chance. Todos os seus dados serão perdidos para sempre. Continuar?"
    );
    if (!secondConfirm) return; 

    const password = await showPasswordPromptModal();
    if (!password) { 
        deleteStatus.textContent = 'A exclusão foi cancelada.';
        return;
    }
    
    deleteStatus.textContent = 'Verificando e apagando conta...';
    changePasswordBtn.disabled = true;

    try {
        
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
        await deleteUser(currentUser);

        deleteStatus.textContent = 'Sua conta foi permanentemente apagada. Sentiremos sua falta!';
        deleteStatus.style.color = 'red';
        window.location.href = '/login.html'; 

    } catch (error) {
        console.error("Erro ao apagar a conta:", error);
        if (error.code === 'auth/wrong-password') {
            deleteStatus.textContent = 'Senha incorreta. A exclusão foi cancelada.';
        } else {
            deleteStatus.textContent = 'Ocorreu um erro. Por segurança, sua conta não foi apagada.';
        }
        deleteStatus.style.color = 'red';
    } finally {
        changePasswordBtn.disabled = false;
    }
});

// MOSTRAR/ESCONDER SENHA
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function () {
        const targetInput = document.querySelector(this.getAttribute('data-target'));
        if (targetInput) {
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        }
    });
});

// Eventos dos botões do modal
modalConfirmBtn.addEventListener('click', () => {
    if (resolveModalPromise) {
        const returnValue = modalInputWrapper.style.display === 'block' ? modalInput.value : true;
        resolveModalPromise(returnValue);
    }
    hideModal();
});

modalCancelBtn.addEventListener('click', () => {
    if (resolveModalPromise) {
        const returnValue = modalInputWrapper.style.display === 'block' ? null : false;
        resolveModalPromise(returnValue);
    }
    hideModal();
});

// 3. EVENTOS QUE SALVAM AS ESCOLHAS DO USUÁRIO
accentColorSelect.addEventListener('change', (event) => {
    const newColor = event.target.value;
    localStorage.setItem('app_accent_color', newColor);
    applySavedSettings(); 
});

themeSelector.addEventListener('change', (event) => {
    const newTheme = event.target.value;
    localStorage.setItem('app_theme', newTheme);
    applySavedSettings(); 
});

defaultViewSelect.addEventListener('change', (event) => {
    const newView = event.target.value;
    localStorage.setItem('app_list_view', newView);
    applySavedSettings(); 
});

toggleProgressBar.addEventListener('change', (event) => {
    const isChecked = event.target.checked;
    localStorage.setItem('show_progress_bar', isChecked);
    applySavedSettings();
});

toggleScore.addEventListener('change', (event) => {
    const isChecked = event.target.checked;
    localStorage.setItem('show_score', isChecked);
    applySavedSettings();
});

defaultSortSelect.addEventListener('change', (event) => {
    localStorage.setItem('list_default_sort', event.target.value);
});

defaultFilterSelect.addEventListener('change', (event) => {
    localStorage.setItem('list_default_filter', event.target.value);
});

//modal botao perfil
botaoPerfil.addEventListener('click', (e) => {
    e.stopPropagation(); 
    perfil.classList.toggle('perfil-dropdown-active');
});

document.addEventListener('click', (e) => {
    if (!perfil.contains(e.target) && !botaoPerfil.contains(e.target)) {
        perfil.classList.remove('perfil-dropdown-active');
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const currentPagePath = window.location.pathname;
    const navLinks = document.querySelectorAll('.perfil-config');
    
    navLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      if (currentPagePath.endsWith(linkPath)) {
        link.classList.add('ativo');
      }
    });
});

//botao sair da conta
botaoSair.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        window.location.href = "/login.html";
      })
      .catch((error) => {
        console.error("Erro ao sair:", error);
      });
});

// trocar abas 
document.addEventListener('DOMContentLoaded', () => {

    const links = document.querySelectorAll('.settings-sidebar .nav-link');

    links.forEach(link => {
        link.addEventListener('click', (event) => {
            // Impede a ação padrão do link
            event.preventDefault();

            // Pega o ID da aba do atributo 'data-tab'
            const tabId = event.currentTarget.dataset.tab;

            // Remove a classe 'active' de todas as abas
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            // Remove a classe 'active' de todos os links
            links.forEach(navLink => navLink.classList.remove('active'));
            
            // Adiciona a classe 'active' na aba e no link clicados
            document.getElementById(tabId).classList.add('active');
            event.currentTarget.classList.add('active');
        });
    });

    // Opcional: Para garantir que a aba inicial 'ativa' seja exibida corretamente ao carregar a página
    const initialActiveLink = document.querySelector('.settings-sidebar .nav-link.active');
    if (initialActiveLink) {
        const initialTabId = initialActiveLink.dataset.tab;
        document.getElementById(initialTabId).classList.add('active');
    }
});




loadSettingsAparencia();

// ===================================================================
// LÓGICA PARA EXPORTAÇÃO DE DADOS
// ===================================================================

// 1. REFERÊNCIAS AOS ELEMENTOS
const exportDataBtn = document.getElementById('exportDataBtn');
const exportStatus = document.getElementById('exportStatus');

// 2. EVENTO DE CLIQUE NO BOTÃO
if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
        if (!currentUser) {
            exportStatus.textContent = "Você precisa estar logado para exportar seus dados.";
            exportStatus.style.color = 'red';
            return;
        }

        exportStatus.textContent = 'Preparando seu backup...';
        exportStatus.style.color = 'black';
        exportDataBtn.disabled = true;
        exportDataBtn.textContent = 'Exportando...';

        try {
            // --- ETAPA 1: BUSCAR OS DADOS DO FIRESTORE ---
            const animesCollectionRef = collection(db, "users", currentUser.uid, "animes");
            const querySnapshot = await getDocs(animesCollectionRef);
            
            const animesData = [];
            querySnapshot.forEach((doc) => {
                const dados = doc.data();
                
                delete dados.id; 
                delete dados.userId;

                animesData.push(dados);
            });
            
            if (animesData.length === 0) {
                exportStatus.textContent = "Sua lista está vazia. Nada para exportar.";
                return;
            }

            // --- ETAPA 2: FORMATAR COMO JSON ---
            // JSON.stringify com 'null, 2' cria um arquivo formatado e legível
            const jsonData = JSON.stringify(animesData, null, 2);
            
            // --- ETAPA 3: CRIAR E INICIAR O DOWNLOAD ---
            // Cria um 'Blob', que é como um arquivo em memória
            const blob = new Blob([jsonData], { type: 'application/json' });

            // Cria uma URL temporária para esse arquivo em memória
            const url = URL.createObjectURL(blob);

            // Cria um elemento de link <a> invisível
            const link = document.createElement('a');
            link.href = url;
            
            // Define o nome do arquivo que será baixado
            const dataHoje = new Date().toISOString().slice(0, 10); // Pega a data de hoje (ex: 2025-06-12)
            link.download = `my-anime-list-backup-${dataHoje}.json`;

            // Adiciona o link ao corpo do documento, clica nele e depois o remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpa a URL temporária da memória
            URL.revokeObjectURL(url);

            exportStatus.textContent = 'Backup gerado com sucesso!';
            exportStatus.style.color = 'green';

        } catch (error) {
            console.error("Erro ao exportar dados:", error);
            exportStatus.textContent = 'Ocorreu um erro ao gerar seu backup.';
            exportStatus.style.color = 'red';
        } finally {
            // Reabilita o botão
            exportDataBtn.disabled = false;
            exportDataBtn.textContent = 'Exportar Meus Dados';
        }
    });
}

// ===================================================================
// LÓGICA PARA IMPORTAÇÃO DE DADOS
// ===================================================================

// 1. REFERÊNCIAS E EVENTOS INICIAIS
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const importStatus = document.getElementById('importStatus');

if (importBtn) {
    importBtn.addEventListener('click', () => importFile.click());
}

if (importFile) {
    importFile.addEventListener('change', handleFileSelect);
}

// 2. FUNÇÃO PRINCIPAL QUE RODA QUANDO UM ARQUIVO É ESCOLHIDO
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    importStatus.textContent = `Lendo o arquivo: ${file.name}...`;
    importStatus.style.color = 'black';

    // Decide qual função de processamento usar com base na extensão
    if (file.name.endsWith('.json')) {
        processJsonFile(file);
    } else if (file.name.endsWith('.xml') || file.name.endsWith('.gz')) {
        processMalFile(file);
    } else {
        importStatus.textContent = 'Tipo de arquivo não suportado.';
        importStatus.style.color = 'red';
    }
}

// Função para adicionar um pequeno atraso
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// PROCESSADOR PARA ARQUIVOS .XML.GZ (MYANIMELIST) - VERSÃO MELHORADA
async function processMalFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // ... (código para descomprimir e ler o XML não muda) ...
            const decompressed = pako.inflate(e.target.result, { to: 'string' });
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(decompressed, "text/xml");
            const animeNodes = xmlDoc.querySelectorAll('anime');
            
            importStatus.textContent = `Arquivo lido. Encontrados ${animeNodes.length} animes. Buscando dados...`;

            const animesCompletos = [];
            for (const [index, node] of animeNodes.entries()) {
                const getText = (tagName) => node.querySelector(tagName)?.textContent || '';

                // Coletamos os dados pessoais que SÃO importantes (nosso progresso)
                const dadosPessoais = {
                    nomeOriginal: getText('series_title'),
                    episodioAtual: parseInt(getText('my_watched_episodes')) || 0,
                    andamento: mapMalStatus(getText('my_status')),
                    favorito: getText('my_tags')?.includes('fav') || false
                    // Note que não precisamos mais pegar a 'my_score' daqui
                };
                
                importStatus.textContent = `Buscando... (${index + 1}/${animeNodes.length}) ${dadosPessoais.nomeOriginal}`;
                
                try {
                    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(dadosPessoais.nomeOriginal)}&limit=1`);
                    const data = await res.json();
                    
                    let animeParaSalvar;

                    if (data.data && data.data.length > 0) {
                        const apiData = data.data[0];
                        
                        // --- A MUDANÇA ESTÁ AQUI ---
                        animeParaSalvar = {
                            ...dadosPessoais, // Seus dados de progresso (eps assistidos, etc.)

                            // Agora, pegamos o máximo de dados 'oficiais' da API
                            nome: apiData.title,
                            imagemCapa: apiData.images.jpg.large_image_url,
                            totalEpisodios: apiData.episodes || 0,
                            status: apiData.status,
                            generos: apiData.genres.map(g => g.name).join(', '),
                            score: apiData.score || null, // <-- USANDO O SCORE DA API JIKAN
                            criadoEm: new Date()
                        };

                    } else {
                        // Se não encontrar na API, salva com os dados que temos
                        animeParaSalvar = {
                            ...dadosPessoais,
                            nome: dadosPessoais.nomeOriginal,
                            imagemCapa: 'img/capa_padrao.webp',
                            totalEpisodios: 0,
                            score: null, // Não há score se não achamos na API
                            status: 'Unknown',
                            generos: '',
                            criadoEm: new Date()
                        };
                    }
                    
                    delete animeParaSalvar.nomeOriginal;
                    animesCompletos.push(animeParaSalvar);

                } catch (apiError) {
                    console.warn(`Não foi possível buscar dados para "${dadosPessoais.nomeOriginal}".`, apiError);
                }
                
                await delay(1000);
            }

            uploadAnimesToFirestore(animesCompletos);

        } catch (error) {
            console.error("Erro ao processar arquivo do MAL:", error);
            importStatus.textContent = 'Erro: O arquivo do MyAnimeList parece estar corrompido.';
            importStatus.style.color = 'red';
        }
    };
    reader.readAsArrayBuffer(file);
}

// Função auxiliar para "traduzir" o status do MAL para o nosso
function mapMalStatus(malStatus) {
    switch (malStatus) {
        case 'Watching': return 'to_vendo';
        case 'Completed': return 'terminei';
        default: return 'nao_comecei'; // Ou outro status padrão seu
    }
}


// 5. FUNÇÃO DE UPLOAD EM LOTE PARA O FIRESTORE
async function uploadAnimesToFirestore(animes) {
    if (!currentUser) { /* ... */ return; }
    importStatus.textContent = `Encontrados ${animes.length} animes. Enviando...`;
    
    const batch = writeBatch(db);
    const animesCollectionRef = collection(db, "users", currentUser.uid, "animes");

    animes.forEach(anime => {
        const newAnimeRef = doc(animesCollectionRef);
        batch.set(newAnimeRef, anime);
    });

    try {
        await batch.commit();
        importStatus.textContent = `${animes.length} animes importados com sucesso!`;
        importStatus.style.color = 'green';
    } catch (error) {
        console.error("Erro ao salvar em lote no Firestore:", error);
        importStatus.textContent = 'Ocorreu um erro ao salvar os dados.';
        importStatus.style.color = 'red';
    }
}

// ===================================================================
// LÓGICA PARA APAGAR TODOS OS ITENS DA LISTA
// ===================================================================

if (deleteAllItemsBtn) {
    deleteAllItemsBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        deleteAllStatus.textContent = '';
        deleteAllStatus.style.color = 'red';

        try {
            // --- PASSO 1: DUPLA CONFIRMAÇÃO COM O MODAL ---
            const firstConfirm = await showConfirmationModal(
                "Apagar TUDO?",
                "Esta ação apagará TODOS os animes da sua lista. Esta ação é permanente e irreversível. Você tem certeza?"
            );
            if (!firstConfirm) {
                deleteAllStatus.textContent = 'Ação cancelada.';
                return;
            }

            // --- PASSO 2: REAUTENTICAÇÃO POR SEGURANÇA ---
            const password = await showPasswordPromptModal();
            if (!password) {
                deleteAllStatus.textContent = 'Senha não fornecida. Ação cancelada.';
                return;
            }

            deleteAllStatus.textContent = 'Verificando e apagando...';
            deleteAllStatus.style.color = 'black';
            deleteAllItemsBtn.disabled = true;

            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);
            
            // --- PASSO 3: LÓGICA DE EXCLUSÃO EM LOTE ---
            deleteAllStatus.textContent = 'Autenticação OK. Apagando todos os itens...';
            
            const animesCollectionRef = collection(db, "users", currentUser.uid, "animes");
            const snapshot = await getDocs(animesCollectionRef);

            if (snapshot.empty) {
                deleteAllStatus.textContent = 'Sua lista já está vazia.';
                deleteAllStatus.style.color = 'green';
                return;
            }

            // O Firestore só permite 500 operações por lote.
            // Este código lida com listas de qualquer tamanho, criando lotes de 500.
            const batchArray = [];
            batchArray.push(writeBatch(db));
            let operationCount = 0;
            let batchIndex = 0;

            snapshot.docs.forEach(doc => {
                batchArray[batchIndex].delete(doc.ref);
                operationCount++;
                if (operationCount === 499) {
                    batchArray.push(writeBatch(db));
                    batchIndex++;
                    operationCount = 0;
                }
            });

            // Envia todos os lotes para o Firestore
            await Promise.all(batchArray.map(batch => batch.commit()));

            deleteAllStatus.textContent = `Toda a sua lista (${snapshot.size} itens) foi apagada com sucesso!`;
            deleteAllStatus.style.color = 'green';

        } catch (error) {
            console.error("Erro ao apagar toda a lista:", error);
            if (error.code === 'auth/wrong-password') {
                deleteAllStatus.textContent = 'Senha incorreta. Ação cancelada.';
            } else {
                deleteAllStatus.textContent = 'Ocorreu um erro. Nenhum item foi apagado.';
            }
            deleteAllStatus.style.color = 'red';
        } finally {
            deleteAllItemsBtn.disabled = false;
        }
    });
}





