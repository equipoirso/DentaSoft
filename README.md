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


<img width="700" height="556" alt="image" src="https://github.com/user-attachments/assets/bb94fce7-8389-4789-a76c-56ccfe5f13bc" />

---

## 📂 Estructura general del proyecto

* **firebase.json / .firebaserc**
	Definen la configuración de despliegue en Firebase Hosting y el proyecto asociado.

* **firestore.rules**
	Contiene las reglas de seguridad de Cloud Firestore, restringiendo el acceso a los datos según autenticación y rol.

*	**functions/**
	Estructura preparada para **Cloud Functions.**
	Actualmente incluye una función HTTP de prueba en index.js y las dependencias definidas en package.json.
	La idea es extender este módulo para tareas como:

* Envío de notificaciones / recordatorios.

* Procesos programados.

* Lógica de negocio que no deba residir en el frontend.

* **public/**
Directorio raíz del frontend que se publica en Firebase Hosting.

* **index.html:** pantalla de acceso inicial al sistema.

* **secretaria-*.html:** vistas específicas para el rol Secretaría (gestión de pacientes, turnos, avisos, reportes, historiales, etc.).

* **odontologo-*.html:** vistas específicas para el rol Odontólogo (agenda de turnos, historial del paciente, odontograma, etc.).

* **common.js:** inicializa Firebase (configuración del proyecto, Auth y Firestore) y expone funciones comunes para los distintos módulos.

* **secretaria.js / odontologo.js:** manejan las interacciones de cada rol con la interfaz y con Firestore.

* **style.css:** define la identidad visual general de la aplicación.

* **assets/:** incluye recursos auxiliares del template (CSS/JS externos).

* **img/:** logos, íconos y demás elementos gráficos de la interfaz.

---

## 🔁 Flujo general de funcionamiento

**1.** El usuario accede al sitio (por ejemplo, index.html) publicado en Firebase Hosting.

**2.** Selecciona su rol y/o es redirigido a la pantalla correspondiente de login
		(secretaria-login.html u odontologo-login.html).

**3.** El formulario de acceso utiliza **Firebase Authentication** para validar las credenciales.

**4.** Una vez autenticado:
- Se consulta la colección users en **Cloud Firestore** para obtener el rol y datos del usuario.
- El sistema redirige al **portal** correspondiente:
	- Secretaría → secretaria-portal.html
	- Odontólogo → odontologo-portal.html
			
**5.** Desde los portales, los distintos módulos (secretaria-*.html, odontologo-*.html) interactúan con Firestore para:
- Registrar y consultar pacientes, turnos, reportes y recetas.
- Mostrar la agenda y el historial según el rol y el contexto.

**6.** Opcionalmente, en futuras versiones, Cloud Functions podrá encargarse de procesos automáticos (recordatorios, notificaciones, tareas programadas, etc.).

---

## 🛠️ Puesta en marcha en local

⚠️ Requiere tener creado un proyecto en Firebase y la configuración correspondiente en common.js (objeto firebaseConfig).

### 1. Clonar el repositorio

git clone https://github.com/tu-usuario/DentaSoft.git
cd DentaSoft-main

### 2. Instalar Firebase CLI (si aún no lo tenés)

npm install -g firebase-tools

### 3. Iniciar sesión en Firebase

firebase login

### 4. Vincular el proyecto local con tu proyecto de Firebase
(si fuera necesario)

firebase use --add

### 5. Opcional: instalar dependencias de Functions

cd functions
npm install
cd ..

### 6. Ejecutar en modo emulador / vista local

* Opción simple: abrir public/index.html con Live Server desde VSCode.

* Opción con Firebase Hosting:

firebase emulators:start --only hosting

Luego acceder a la URL local que indique la consola (por ejemplo, http://localhost:5000).

---

## ☁️ Despliegue en Firebase Hosting

Con el proyecto ya vinculado a un proyecto de Firebase:

firebase deploy --only hosting

Si en futuras versiones se utilizan Cloud Functions:
firebase deploy --only hosting,functions

---

## 👥 Autores

Proyecto desarrollado por el **equipo # 2** de **Taller 6**:
- Aguilera, Federico
- Alejo, Diego
- Diaz, Cristian
- Romero, Daniel
- Torres, Martin

---
