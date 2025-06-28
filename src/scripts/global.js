import { auth, db } from '/src/scripts/config/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { aceitarPedidoService, removerRelacionamentoService } from '/src/scripts/core/friendship-service.js';



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
            iniciarListenerDeNotificacoes(user);
        } else {
            pararListenerDeNotificacoes();
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
    notificacaoModal();
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

function notificacaoModal() {
    const btnNotificacao = document.getElementById("notificacao-trigger");
    const notificacaoDropdown = document.getElementById('notificacao-dropdown');
    const listaNotificacoes = document.getElementById('lista-notificacoes');

    if (!btnNotificacao || !notificacaoDropdown || !listaNotificacoes) {
        console.error("Elementos do modal de notificação não encontrados. A funcionalidade não será ativada.");
        return;
    }

    btnNotificacao.addEventListener('click', (event) => {
        event.stopPropagation();
        notificacaoDropdown.classList.toggle('visivel');
    });
    
    document.addEventListener('click', (event) => {
        if (notificacaoDropdown.classList.contains('visivel') && !notificacaoDropdown.contains(event.target) && !btnNotificacao.contains(event.target)) {
            notificacaoDropdown.classList.remove('visivel');
        }
    });

    listaNotificacoes.addEventListener('click', async (event) => {
        const target = event.target;
        const senderId = target.dataset.senderId;

        if (!senderId) return;

        const itemLi = target.closest('.notificacao-item');

        itemLi.querySelectorAll('button').forEach(btn => btn.disabled = true);

        if (target.classList.contains('btn-aceitar')) {
            console.log(`Aceitando pedido de ${senderId}...`);
            // Chama a nossa função de serviço que SÓ fala com o banco de dados
            const success = await aceitarPedidoService(auth.currentUser.uid, senderId);
            if (success) {
                // Se deu certo, remove a notificação da lista
                itemLi.remove(); 
            } else {
                // Se falhou, reabilita os botões para o usuário tentar de novo
                itemLi.querySelectorAll('button').forEach(btn => btn.disabled = false);
                alert("Ocorreu um erro ao aceitar o pedido.");
            }
        }

        // Verifica se o botão de RECUSAR foi clicado
        if (target.classList.contains('btn-recusar')) {
            console.log(`Recusando pedido de ${senderId}...`);
            // Chama a nossa função de serviço que SÓ fala com o banco de dados
            const success = await removerRelacionamentoService(auth.currentUser.uid, senderId);
            if (success) {
                // Se deu certo, remove a notificação da lista
                itemLi.remove();
            } else {
                itemLi.querySelectorAll('button').forEach(btn => btn.disabled = false);
                alert("Ocorreu um erro ao recusar o pedido.");
            }
        }
    });
}

let unsubscribeNotificacoes = null;

function iniciarListenerDeNotificacoes(user) {
    if (!user || unsubscribeNotificacoes) return;

    const notificacaoBadge = document.getElementById('notificacao-badge');
    const listaNotificacoes = document.getElementById('lista-notificacoes');
    const notificacaoVazia = document.getElementById('notificacao-vazia');

    const q = query(collection(db, 'friendships'), 
        where('users', 'array-contains', user.uid), 
        where('status', '==', 'pending')
    );

    unsubscribeNotificacoes = onSnapshot(q, async (snapshot) => {
        const pedidosRecebidos = snapshot.docs.filter(doc => doc.data().requestedBy !== user.uid);
        const numPedidos = pedidosRecebidos.length;

        if (notificacaoBadge) {
            if (numPedidos > 0) {
                notificacaoBadge.textContent = numPedidos;
                notificacaoBadge.style.display = 'block';
            } else {
                notificacaoBadge.style.display = 'none';
            }
        }
        
        if (listaNotificacoes) listaNotificacoes.innerHTML = '';

        if (numPedidos === 0) {
            if (notificacaoVazia) notificacaoVazia.style.display = 'block';
            return;
        }
        if (notificacaoVazia) notificacaoVazia.style.display = 'none';

        for (const requestDoc of pedidosRecebidos) {
            const senderId = requestDoc.data().requestedBy;
            const profileRef = doc(db, "profiles", senderId);
            const profileSnap = await getDoc(profileRef); 

            if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                
                const li = document.createElement('li');
                li.className = 'notificacao-item';
                li.dataset.senderId = senderId; 
                
                li.innerHTML = `
                    <img src="${profileData.profilePicUrl || '/src/assets/img/semimagem.jpg'}" alt="Avatar" class="notificacao-avatar">
                    <div class="notificacao-texto">
                        <strong>${profileData.displayName || 'Um usuário'}</strong> quer ser seu amigo.
                    </div>
                    <div class="notificacao-acoes">
                        <button class="btn-aceitar" data-sender-id="${senderId}">Aceitar</button>
                        <button class="btn-recusar" data-sender-id="${senderId}">Recusar</button>
                    </div>
                `;
                if(listaNotificacoes) listaNotificacoes.appendChild(li);
            }
        }
    });
}

function pararListenerDeNotificacoes() {
    if (unsubscribeNotificacoes) {
        unsubscribeNotificacoes();
        unsubscribeNotificacoes = null;
    }
}
