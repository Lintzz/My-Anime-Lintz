import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyByRhYfsV9g1EFjBmdSx_5bHCPBkib_It0",
    authDomain: "my-anime-lintz.firebaseapp.com",
    projectId: "my-anime-lintz",
    storageBucket: "my-anime-lintz.firebasestorage.app",
    messagingSenderId: "369796437978",
    appId: "1:369796437978:web:a18960700b93a6c51852e3"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };