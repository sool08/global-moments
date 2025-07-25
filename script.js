
const firebaseConfig = {
  apiKey: "AIzaSyCQXkx4TRz2R2QbbQHausClepz9hL1JnJM",
  authDomain: "hopeline-anonymous-support.firebaseapp.com",
  projectId: "hopeline-anonymous-support",
  storageBucket: "hopeline-anonymous-support.firebasestorage.app",
  messagingSenderId: "755149531669",
  appId: "1:755149531669:web:a5e905cc4276378fb73c1c"
};// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Obtén una referencia a Firestore Database y Firebase Storage
const db = firebase.firestore();
const storage = firebase.storage();

// **2. REFERENCIAS A ELEMENTOS DEL DOM (HTML)**
const captureButton = document.getElementById('captureButton');
const modal = document.getElementById('modal');
const closeButton = document.querySelector('.close-button');
const instantForm = document.getElementById('instantForm');
const mediaFile = document.getElementById('mediaFile');
const phraseText = document.getElementById('phraseText');
const emotionTag = document.getElementById('emotionTag');
const locationText = document.getElementById('locationText');
const manifestContainer = document.getElementById('manifestContainer');

// **3. LÓGICA DEL MODAL (VENTANA EMERGENTE)**
captureButton.addEventListener('click', () => {
    modal.style.display = 'flex'; // Muestra el modal
});

closeButton.addEventListener('click', () => {
    modal.style.display = 'none'; // Oculta el modal
    instantForm.reset(); // Limpia el formulario al cerrar
});

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = 'none'; // Oculta el modal si se hace clic fuera
        instantForm.reset(); // Limpia el formulario al cerrar
    }
});

// **4. LÓGICA PARA ENVIAR UN "INSTANTE" A FIREBASE**
instantForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que el formulario se envíe de forma tradicional

    const file = mediaFile.files[0];
    const phrase = phraseText.value;
    const emotion = emotionTag.value;
    const location = locationText.value;

    // Validaciones básicas (puedes expandirlas)
    if (!file && phrase.trim() === '') {
        alert('Por favor, sube un archivo o escribe una frase.');
        return;
    }
    if (emotion === '') {
        alert('Por favor, selecciona una emoción.');
        return;
    }
    if (phrase.trim().split(' ').length > 5 && phrase.trim() !== '') {
        alert('La frase no puede tener más de 5 palabras.');
        return;
    }

    let mediaUrl = ''; // Para guardar la URL del archivo (si hay)

    try {
        if (file) {
            // Sube el archivo a Firebase Storage
            const storageRef = storage.ref(`instantes/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            mediaUrl = await snapshot.ref.getDownloadURL();
            console.log('Archivo subido:', mediaUrl);
        }

        // Guarda la información del instante en Firestore
        await db.collection('instantes').add({
            mediaUrl: mediaUrl,
            phrase: phrase,
            emotion: emotion,
            location: location,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Fecha y hora del servidor
        });

        alert('¡Tu Instante ha sido enviado!');
        modal.style.display = 'none'; // Cierra el modal
        instantForm.reset(); // Limpia el formulario
        loadInstants(); // Recarga los instantes para mostrar el nuevo
    } catch (error) {
        console.error('Error al enviar el instante:', error);
        alert('Hubo un error al enviar tu Instante. Inténtalo de nuevo.');
    }
});

// **5. LÓGICA PARA CARGAR Y MOSTRAR LOS "INSTANTES"**
async function loadInstants() {
    manifestContainer.innerHTML = '<p>Cargando instantes...</p>'; // Mensaje de carga

    try {
        // Obtén los últimos 20 instantes, ordenados por fecha de creación (los más nuevos primero)
        const snapshot = await db.collection('instantes')
                                  .orderBy('timestamp', 'desc')
                                  .limit(20) // Muestra solo los últimos 20 para empezar
                                  .get();

        manifestContainer.innerHTML = ''; // Limpia el contenedor

        if (snapshot.empty) {
            manifestContainer.innerHTML = '<p>Aún no hay instantes. ¡Sé el primero en compartir!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'instant-card';

            let mediaContent = '';
            if (data.mediaUrl) {
                const fileExtension = data.mediaUrl.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension.split('?')[0])) {
                    mediaContent = `<img src="${data.mediaUrl}" alt="Instante">`;
                } else if (['mp4', 'webm', 'ogg'].includes(fileExtension.split('?')[0])) {
                    mediaContent = `<video src="${data.mediaUrl}" controls></video>`;
                } else if (['mp3', 'wav', 'ogg'].includes(fileExtension.split('?')[0])) {
                    mediaContent = `<audio src="${data.mediaUrl}" controls></audio>`;
                } else {
                    mediaContent = `<p>Archivo multimedia no reproducible directamente. <a href="${data.mediaUrl}" target="_blank">Descargar</a></p>`;
                }
            }

            card.innerHTML = `
                ${mediaContent}
                <p>${data.phrase || ''}</p>
                <div class="details">
                    <span class="emotion-tag">${data.emotion}</span>
                    ${data.location ? ` - <span>${data.location}</span>` : ''}
                </div>
            `;
            manifestContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar los instantes:', error);
        manifestContainer.innerHTML = '<p>Hubo un error al cargar los instantes.</p>';
    }
}

// Carga los instantes cuando la página se carga por primera vez
document.addEventListener('DOMContentLoaded', loadInstants);
