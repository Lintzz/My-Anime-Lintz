import { db } from '/src/scripts/config/firebase-init.js';
import { doc, setDoc, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

export async function enviarPedidoDeAmizadeService(loggedInUserId, targetUserId) {
    const ids = [loggedInUserId, targetUserId];
    ids.sort();
    const friendshipId = ids.join('_');
    const dadosDoPedido = { users: ids, status: 'pending', requestedBy: loggedInUserId, createdAt: serverTimestamp() };
    
    try {
        await setDoc(doc(db, 'friendships', friendshipId), dadosDoPedido);
        return true;
    } catch (error) {
        console.error("Erro de serviço - enviarPedido:", error);
        return false;
    }
}

export async function aceitarPedidoService(loggedInUserId, senderId) {
    const ids = [loggedInUserId, senderId];
    ids.sort();
    const friendshipId = ids.join('_');
    try {
        await updateDoc(doc(db, 'friendships', friendshipId), { status: 'friends' });
        return true;
    } catch (error) {
        console.error("Erro de serviço - aceitarPedido:", error);
        return false;
    }
}

export async function removerRelacionamentoService(loggedInUserId, targetUserId) {
    const ids = [loggedInUserId, targetUserId];
    ids.sort();
    const friendshipId = ids.join('_');
    try {
        await deleteDoc(doc(db, 'friendships', friendshipId));
        return true;
    } catch (error) {
        console.error("Erro de serviço - removerRelacionamento:", error);
        return false;
    }
}