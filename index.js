import { getDatabase, ref, get, child, set, push } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCm2XNaOodQCc5q5xBJOq2_zbwypXDvBcw",
    authDomain: "webpass2024.firebaseapp.com",
    databaseURL: "https://webpass2024-default-rtdb.firebaseio.com",
    projectId: "webpass2024",
    storageBucket: "webpass2024.firebasestorage.app",
    messagingSenderId: "288778804676",
    appId: "1:288778804676:web:e0d5c24eab50b9674f9891"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Referencias a los formularios
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const registerLink = document.getElementById("registerLink");
const registerSubmit = document.getElementById("registerSubmit");

// Función para iniciar sesión
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const usersRef = ref(db, 'user');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    let userFound = false;

    for (const userId in users) {
        if (users[userId].username === username && users[userId].password === password) {
            userFound = true;
            sessionStorage.setItem("username", username); // Guardar ID en sessionStorage
            alert("Inicio de sesión exitoso.");
            window.location.href = 'panel.html'; // Redirigir al panel de control
            break;
        }
    }

    if (!userFound) {
        alert("Usuario o contraseña incorrectos.");
    }
});

// Mostrar el formulario de registro
registerLink.addEventListener("click", () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

// Función para registrar un nuevo usuario
registerSubmit.addEventListener("submit", async (e) => {
    e.preventDefault();
    const registerid = document.getElementById("registerid").value;
    const registerUsername = document.getElementById("registerUsername").value;
    const registerPassword = document.getElementById("registerPassword").value;

    // Validación
    if (!registerUsername || !registerPassword) {
        alert("Por favor, ingresa todos los campos.");
        return;
    }

    // Verificar si el nombre de usuario ya existe
    const usersRef = ref(db, "user");
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    let usernameExists = false;
    for (const userId in users) {
        if (users[userId].username === registerUsername) {
            usernameExists = true;
            break;
        }
    }

    if (usernameExists) {
        alert("El nombre de usuario ya está en uso.");
        return;
    }

    // Agregar el nuevo usuario a la base de datos
    const newUserRef = push(ref(db, "user"));
    await set(newUserRef, {
        id: registerid,
        username: registerUsername,
        password: registerPassword
    });

    alert("Cuenta registrada con éxito.");
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
});
