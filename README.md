# <img width="189" height="33" alt="image" src="https://github.com/user-attachments/assets/a1aa0969-6cb4-43ee-a1b7-0448308bb053" /> <img width="31" height="34" alt="image" src="https://github.com/user-attachments/assets/bbbda0a8-b91a-47d8-bbd6-b99c6d3180a3" />


DentaSoft es una aplicación web para la gestión integral de consultorios odontológicos, desarrollada como proyecto académico para la cátedra **Taller 6 / Desarrollo de Proyecto Tecnológico**.

El sistema permite diferenciar el acceso según el rol del usuario (secretaría u odontólogo), administrar pacientes, turnos y la información clínica básica, centralizando los datos en **Firebase**.

---

## 🚀 Objetivos del proyecto

- Digitalizar y ordenar la gestión diaria de un consultorio odontológico.
- Separar claramente las funcionalidades de **secretaría** y **odontólogo**.
- Ofrecer una interfaz web simple, usable y adaptable a distintos dispositivos.
- Utilizar una arquitectura basada en **Firebase** (Hosting, Auth, Firestore) con frontend en HTML/CSS/JavaScript.

---

## 🧱 Tecnologías utilizadas

- **Frontend**
  - HTML5
  - CSS3 (`style.css`)
  - JavaScript (módulos ES6 en `/public/*.js`)

- **Backend / BaaS**
  - [Firebase Hosting](https://firebase.google.com/docs/hosting)
  - [Firebase Authentication](https://firebase.google.com/docs/auth)
  - [Cloud Firestore](https://firebase.google.com/docs/firestore)
  - [Cloud Functions for Firebase](https://firebase.google.com/docs/functions) (estructura inicial preparada)

- **Herramientas**
  - Firebase CLI
  - Visual Studio Code / Live Server (para desarrollo local)
  - Git y GitHub (control de versiones)

---

## 📂 Estructura general del proyecto

```text
DentaSoft-main/
├── firebase.json                 # Configuración de Firebase Hosting / Functions
├── firestore.rules               # Reglas de seguridad de Firestore
├── .firebaserc                   # Alias del proyecto Firebase
├── functions/                    # Cloud Functions (backend serverless)
│   ├── index.js                  # Función HTTP de ejemplo / punto de entrada
│   └── package.json              # Dependencias de las funciones
└── public/                       # Frontend estático servido por Firebase Hosting
    ├── index.html                # Pantalla principal / login inicial
    ├── common.js                 # Inicialización de Firebase y lógica compartida
    ├── style.css                 # Estilos globales de la aplicación
    ├── assets/                   # Librerías, fuentes, CSS y JS auxiliares
    │   └── style.css             # Estilos adicionales del template base
    ├── img/                      # Imágenes, logos e íconos utilizados en la UI
    ├── odontologo-login.html     # Login específico para odontólogos
    ├── odontologo-portal.html    # Panel principal del odontólogo
    ├── odontologo-lista-turnos.html
    ├── odontologo-pacientes.html
    ├── odontologo-odontograma.html
    ├── odontologo-historial.html
    ├── secretaria-login.html     # Login específico para secretaría
    ├── secretaria-portal.html    # Panel principal de secretaría
    ├── secretaria-pacientes.html
    ├── secretaria-turnos.html
    ├── secretaria-avisos.html
    ├── secretaria-reportes.html
    ├── secretaria-historiales.html
    ├── secretaria.js             # Lógica JS asociada a vistas de secretaría
    ├── odontologo.js             # Lógica JS asociada a vistas de odontólogo
    └── ...                       # Otros recursos estáticos relacionados



