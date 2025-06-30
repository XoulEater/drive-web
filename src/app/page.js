"use client";
import { useState, useEffect } from "react";
import { apiService } from "../services/api";

export default function DriveWeb() {
    // Estados principales
    const [user, setUser] = useState(null);
    const [currentPath, setCurrentPath] = useState("/");
    const [fileSystem, setFileSystem] = useState({});
    const [items, setItems] = useState([]);
    const [showCreateDrive, setShowCreateDrive] = useState(false);
    const [showCreateFile, setShowCreateFile] = useState(false);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [showFileContent, setShowFileContent] = useState(null);
    const [showFileProperties, setShowFileProperties] = useState(null);
    const [showEditFile, setShowEditFile] = useState(null);
    const [showShareDialog, setShowShareDialog] = useState(null);
    const [showCopyDialog, setShowCopyDialog] = useState(null);
    const [showMoveDialog, setShowMoveDialog] = useState(null);
    const [showLoadFile, setShowLoadFile] = useState(false);

    // Estados para formularios
    const [driveForm, setDriveForm] = useState({ name: "", size: "" });
    const [fileForm, setFileForm] = useState({
        name: "",
        content: "",
        extension: "txt",
    });
    const [folderForm, setFolderForm] = useState({ name: "" });
    const [loginForm, setLoginForm] = useState({ name: "" });
    const [shareForm, setShareForm] = useState({ targetUser: "" });
    const [copyMoveForm, setCopyMoveForm] = useState({ targetPath: "/" });
    const [loadedFile, setLoadedFile] = useState(null);

    // Cargar datos del API al iniciar
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await apiService.getData();
                setFileSystem(data);
            } catch (error) {
                console.error("Error loading data:", error);
                setFileSystem({});
            }
        };

        loadData();
    }, []);

    // Guardar datos en API
    const saveData = async (data) => {
        try {
            await apiService.saveData(data);
            setFileSystem(data);
        } catch (error) {
            console.error("Error saving data:", error);
            alert("Error al guardar los datos. Por favor, intenta de nuevo.");
        }
    };

    // Crear nuevo drive
    const createDrive = async () => {
        if (!driveForm.name || !driveForm.size) return;

        const newData = {
            ...fileSystem,
            [driveForm.name]: {
                maxSize: parseInt(driveForm.size),
                currentSize: 0,
                structure: {
                    "/": {
                        type: "folder",
                        children: {},
                        created: new Date().toISOString(),
                    },
                    "/shared": {
                        type: "folder",
                        children: {},
                        created: new Date().toISOString(),
                    },
                },
            },
        };

        await saveData(newData);
        setDriveForm({ name: "", size: "" });
        setShowCreateDrive(false);
    };

    // Entrar al drive
    const enterDrive = () => {
        if (!loginForm.name || !fileSystem[loginForm.name]) return;

        setUser(loginForm.name);
        setCurrentPath("/");
        loadCurrentDirectory("/");
        setLoginForm({ name: "" });
    };

    // Cargar directorio actual
    const loadCurrentDirectory = (path = currentPath) => {
        if (!user || !fileSystem[user]) return;

        const structure = fileSystem[user].structure;
        const currentDir = structure[path];

        if (currentDir && currentDir.type === "folder") {
            const itemsList = Object.entries(currentDir.children || {}).map(
                ([name, item]) => ({
                    name,
                    ...item,
                })
            );
            setItems(itemsList);
        }
    };

    // Crear archivo
    const createFile = async () => {
        if (!fileForm.name || !user) return;

        const fileName = `${fileForm.name}.${fileForm.extension}`;
        const fileSize = fileForm.content.length;

        // Verificar espacio disponible
        if (
            fileSystem[user].currentSize + fileSize >
            fileSystem[user].maxSize
        ) {
            alert("No hay suficiente espacio disponible");
            return;
        }

        // Verificar si existe
        const currentDir = fileSystem[user].structure[currentPath];
        if (currentDir.children[fileName]) {
            if (!confirm(`¿Desea sobrescribir el archivo ${fileName}?`)) return;
        }

        const newData = { ...fileSystem };
        newData[user].structure[currentPath].children[fileName] = {
            type: "file",
            content: fileForm.content,
            size: fileSize,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
        };
        newData[user].currentSize += fileSize;

        await saveData(newData);
        loadCurrentDirectory();
        setFileForm({ name: "", content: "", extension: "txt" });
        setShowCreateFile(false);
    };

    // Crear carpeta
    const createFolder = async () => {
        if (!folderForm.name || !user) return;

        const currentDir = fileSystem[user].structure[currentPath];
        if (currentDir.children[folderForm.name]) {
            if (!confirm(`¿Desea sobrescribir la carpeta ${folderForm.name}?`))
                return;
        }

        const newData = { ...fileSystem };
        const folderPath =
            currentPath === "/"
                ? `/${folderForm.name}`
                : `${currentPath}/${folderForm.name}`;

        newData[user].structure[currentPath].children[folderForm.name] = {
            type: "folder",
            created: new Date().toISOString(),
        };
        newData[user].structure[folderPath] = {
            type: "folder",
            children: {},
            created: new Date().toISOString(),
        };

        await saveData(newData);
        loadCurrentDirectory();
        setFolderForm({ name: "" });
        setShowCreateFolder(false);
    };

    // Cambiar directorio
    const changeDirectory = (folderName) => {
        const newPath =
            currentPath === "/"
                ? `/${folderName}`
                : `${currentPath}/${folderName}`;
        setCurrentPath(newPath);
        loadCurrentDirectory(newPath);
    };

    // Navegar hacia atrás
    const navigateUp = () => {
        if (currentPath === "/") return;
        const pathParts = currentPath.split("/");
        pathParts.pop();
        const newPath = pathParts.length === 1 ? "/" : pathParts.join("/");
        setCurrentPath(newPath);
        loadCurrentDirectory(newPath);
    };

    // Eliminar archivo/carpeta
    const deleteItem = async (itemName, isFolder) => {
        if (!confirm(`¿Está seguro de eliminar ${itemName}?`)) return;

        const newData = { ...fileSystem };

        // Recursive function to delete a folder and all its children
        const deleteFolderRecursively = (folderPath) => {
            const folder = newData[user].structure[folderPath];
            if (!folder || folder.type !== "folder") return;

            // Delete all children
            for (const childName in folder.children) {
                const child = folder.children[childName];
                if (child.type === "folder") {
                    const childPath =
                        folderPath === "/"
                            ? `/${childName}`
                            : `${folderPath}/${childName}`;
                    deleteFolderRecursively(childPath);
                } else if (child.type === "file") {
                    newData[user].currentSize -= child.size;
                }
            }
            // Delete the folder itself from structure
            delete newData[user].structure[folderPath];
        };

        const item = newData[user].structure[currentPath].children[itemName];

        if (item.type === "file") {
            newData[user].currentSize -= item.size;
            delete newData[user].structure[currentPath].children[itemName];
        } else if (isFolder) {
            const folderPath =
                currentPath === "/"
                    ? `/${itemName}`
                    : `${currentPath}/${itemName}`;
            deleteFolderRecursively(folderPath);
            delete newData[user].structure[currentPath].children[itemName];
        }

        await saveData(newData);
        loadCurrentDirectory();
    };

    // Compartir archivo
    const shareFile = async (fileName) => {
        if (!shareForm.targetUser || !fileSystem[shareForm.targetUser]) {
            alert("Usuario no encontrado");
            return;
        }

        const file = fileSystem[user].structure[currentPath].children[fileName];
        const newData = { ...fileSystem };

        newData[shareForm.targetUser].structure["/shared"].children[fileName] =
            {
                ...file,
                sharedBy: user,
                sharedDate: new Date().toISOString(),
            };

        await saveData(newData);
        setShareForm({ targetUser: "" });
        setShowShareDialog(null);
        alert("Archivo compartido exitosamente");
    };

    // Editar archivo
    const editFile = async () => {
        if (!showEditFile || !user) return;

        const newData = { ...fileSystem };
        const oldSize =
            newData[user].structure[currentPath].children[showEditFile.name]
                .size;
        const newSize = showEditFile.content.length;

        if (
            fileSystem[user].currentSize - oldSize + newSize >
            fileSystem[user].maxSize
        ) {
            alert("No hay suficiente espacio disponible");
            return;
        }

        newData[user].structure[currentPath].children[
            showEditFile.name
        ].content = showEditFile.content;
        newData[user].structure[currentPath].children[showEditFile.name].size =
            newSize;
        newData[user].structure[currentPath].children[
            showEditFile.name
        ].modified = new Date().toISOString();
        newData[user].currentSize =
            newData[user].currentSize - oldSize + newSize;

        await saveData(newData);
        loadCurrentDirectory();
        setShowEditFile(null);
    };

    // Generar breadcrumbs
    const getBreadcrumbs = () => {
        if (currentPath === "/") return [{ name: "Inicio", path: "/" }];

        const parts = currentPath.split("/").filter((part) => part);
        const breadcrumbs = [{ name: "Inicio", path: "/" }];

        let path = "";
        parts.forEach((part) => {
            path += `/${part}`;
            breadcrumbs.push({ name: part, path });
        });

        return breadcrumbs;
    };

    // Navegar por breadcrumbs
    const navigateToBreadcrumb = (path) => {
        setCurrentPath(path);
        loadCurrentDirectory(path);
    };

    // Obtener todas las rutas disponibles para copiar/mover
    const getAllPaths = () => {
        if (!user || !fileSystem[user]) return [];

        const paths = [];
        const structure = fileSystem[user].structure;

        Object.keys(structure).forEach((path) => {
            if (structure[path].type === "folder") {
                if (path === "/shared") return;

                paths.push(path);
            }
        });

        return paths.sort();
    };

    // Copiar archivo
    const copyFile = async () => {
        if (!showCopyDialog || !copyMoveForm.targetPath) return;

        const sourcePath = currentPath;
        const targetPath = copyMoveForm.targetPath;
        const fileName = showCopyDialog.name;

        if (sourcePath === targetPath) {
            alert("La carpeta de origen y destino no pueden ser la misma");
            return;
        }

        const newData = { ...fileSystem };
        const sourceFile =
            newData[user].structure[sourcePath].children[fileName];

        // Verificar espacio disponible
        if (
            newData[user].currentSize + sourceFile.size >
            newData[user].maxSize
        ) {
            alert("No hay suficiente espacio disponible");
            return;
        }

        // Verificar si existe en destino
        if (newData[user].structure[targetPath].children[fileName]) {
            if (
                !confirm(
                    `¿Desea sobrescribir el archivo ${fileName} en el destino?`
                )
            )
                return;
        }

        // Copiar archivo
        newData[user].structure[targetPath].children[fileName] = {
            ...sourceFile,
            created: new Date().toISOString(),
        };
        newData[user].currentSize += sourceFile.size;

        await saveData(newData);
        loadCurrentDirectory();
        setCopyMoveForm({ targetPath: "/" });
        setShowCopyDialog(null);
        alert("Archivo copiado exitosamente");
    };

    // Mover archivo o directorio
    const moveItem = async () => {
        if (!showMoveDialog || !copyMoveForm.targetPath) return;

        const sourcePath = currentPath;
        const targetPath = copyMoveForm.targetPath;
        const itemName = showMoveDialog.name;
        const isFolder = showMoveDialog.type === "folder";

        if (sourcePath === targetPath) {
            alert("La carpeta de origen y destino no pueden ser la misma");
            return;
        }

        // Verificar que no se mueva una carpeta dentro de sí misma
        if (
            isFolder &&
            targetPath.startsWith(
                sourcePath === "/"
                    ? `/${itemName}`
                    : `${sourcePath}/${itemName}`
            )
        ) {
            alert("No se puede mover una carpeta dentro de sí misma");
            return;
        }

        const newData = { ...fileSystem };
        const sourceItem =
            newData[user].structure[sourcePath].children[itemName];

        // Verificar si existe en destino
        if (newData[user].structure[targetPath].children[itemName]) {
            if (!confirm(`¿Desea sobrescribir ${itemName} en el destino?`))
                return;
        }

        // Mover item
        newData[user].structure[targetPath].children[itemName] = sourceItem;
        delete newData[user].structure[sourcePath].children[itemName];

        // Si es carpeta, actualizar la estructura de paths
        if (isFolder) {
            const oldFolderPath =
                sourcePath === "/"
                    ? `/${itemName}`
                    : `${sourcePath}/${itemName}`;
            const newFolderPath =
                targetPath === "/"
                    ? `/${itemName}`
                    : `${targetPath}/${itemName}`;

            // Copiar estructura de la carpeta
            newData[user].structure[newFolderPath] =
                newData[user].structure[oldFolderPath];
            delete newData[user].structure[oldFolderPath];

            // Actualizar todas las subcarpetas
            Object.keys(newData[user].structure).forEach((path) => {
                if (path.startsWith(oldFolderPath + "/")) {
                    const newPath = path.replace(oldFolderPath, newFolderPath);
                    newData[user].structure[newPath] =
                        newData[user].structure[path];
                    delete newData[user].structure[path];
                }
            });
        }

        await saveData(newData);
        loadCurrentDirectory();
        setCopyMoveForm({ targetPath: "/" });
        setShowMoveDialog(null);
        alert(`${isFolder ? "Carpeta" : "Archivo"} movido exitosamente`);
    };

    // Cargar archivo desde el equipo
    const handleFileLoad = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Verificar que sea archivo de texto
        if (
            !file.type.startsWith("text/") &&
            !file.name.match(/\.(txt|md|html|css|js|json|xml)$/i)
        ) {
            alert("Solo se permiten archivos de texto");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const fileSize = content.length;

            // Verificar espacio disponible
            if (
                fileSystem[user].currentSize + fileSize >
                fileSystem[user].maxSize
            ) {
                alert("No hay suficiente espacio disponible");
                return;
            }

            // Verificar si existe
            const currentDir = fileSystem[user].structure[currentPath];
            if (currentDir.children[file.name]) {
                if (!confirm(`¿Desea sobrescribir el archivo ${file.name}?`))
                    return;
            }

            const newData = { ...fileSystem };
            newData[user].structure[currentPath].children[file.name] = {
                type: "file",
                content: content,
                size: fileSize,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
            };
            newData[user].currentSize += fileSize;

            await saveData(newData);
            loadCurrentDirectory();
            setShowLoadFile(false);
            alert("Archivo cargado exitosamente");
        };
        reader.readAsText(file);
    };

    // Descargar archivo
    const downloadFile = (item) => {
        const element = document.createElement("a");
        const file = new Blob([item.content], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = item.name;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Cargar directorio cuando cambia el usuario
    useEffect(() => {
        if (user) {
            loadCurrentDirectory();
        }
    }, [user, currentPath]);

    console.log("File System:", fileSystem);
    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    Drive Web
                </h1>

                {/* Login/Create Drive Section */}
                {!user && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Login */}
                            <div>
                                <h2 className="text-xl font-semibold mb-4">
                                    Entrar al Drive
                                </h2>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Nombre de usuario"
                                        value={loginForm.name}
                                        onChange={(e) =>
                                            setLoginForm({
                                                name: e.target.value,
                                            })
                                        }
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    <button
                                        onClick={enterDrive}
                                        className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                                    >
                                        Entrar
                                    </button>
                                </div>
                            </div>

                            {/* Create Drive */}
                            <div>
                                <h2 className="text-xl font-semibold mb-4">
                                    Crear Nuevo Drive
                                </h2>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Nombre de usuario"
                                        value={driveForm.name}
                                        onChange={(e) =>
                                            setDriveForm({
                                                ...driveForm,
                                                name: e.target.value,
                                            })
                                        }
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Tamaño en bytes"
                                        value={driveForm.size}
                                        onChange={(e) =>
                                            setDriveForm({
                                                ...driveForm,
                                                size: e.target.value,
                                            })
                                        }
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    <button
                                        onClick={createDrive}
                                        className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
                                    >
                                        Crear Drive
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Drive Interface */}
                {user && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Drive de {user}
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Espacio usado:{" "}
                                        {fileSystem[user]?.currentSize || 0} /{" "}
                                        {fileSystem[user]?.maxSize || 0} bytes
                                    </p>
                                </div>
                                <button
                                    onClick={() => setUser(null)}
                                    className="main-button red"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        height="20px"
                                        viewBox="0 0 24 24"
                                        width="20px"
                                        fill="currentColor"
                                    >
                                        <path d="M0 0h24v24H0z" fill="none" />
                                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                    </svg>
                                    Cerrar Sesión
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setShowCreateFile(true)}
                                    className="main-button blue"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        height="20px"
                                        viewBox="0 0 24 24"
                                        width="20px"
                                        fill="currentColor"
                                    >
                                        <path d="M0 0h24v24H0z" fill="none" />
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 14h-3v3h-2v-3H8v-2h3v-3h2v3h3v2zm-3-7V3.5L18.5 9H13z" />
                                    </svg>
                                    Crear Archivo
                                </button>
                                <button
                                    onClick={() => setShowCreateFolder(true)}
                                    className="main-button green"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        height="20px"
                                        viewBox="0 0 24 24"
                                        width="20px"
                                        fill="currentColor"
                                    >
                                        <path d="M0 0h24v24H0V0z" fill="none" />
                                        <path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z" />
                                    </svg>
                                    Crear Carpeta
                                </button>
                                <button
                                    onClick={() => setShowLoadFile(true)}
                                    className="main-button indigo"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        height="20px"
                                        viewBox="0 0 24 24"
                                        width="20px"
                                        fill="currentColor"
                                    >
                                        <path d="M0 0h24v24H0V0z" fill="none" />
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z" />
                                    </svg>
                                    Cargar Archivo
                                </button>
                                {currentPath !== "/" && (
                                    <button
                                        onClick={navigateUp}
                                        className="main-button gray"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            height="20px"
                                            viewBox="0 0 24 24"
                                            width="20px"
                                            fill="#ffffffff"
                                        >
                                            <path
                                                d="M0 0h24v24H0z"
                                                fill="none"
                                            />
                                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                        </svg>
                                        Volver
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* File Explorer */}
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h3 className="text-lg font-semibold mb-4">
                                Contenido del Directorio
                            </h3>
                            {/* Breadcrumbs */}
                            <nav
                                className="flex px-5 py-3 text-gray-700 border border-gray-200 rounded-lg bg-gray-50 mb-4"
                                aria-label="Breadcrumb"
                            >
                                <ol className="inline-flex items-center space-x-1">
                                    {getBreadcrumbs().map(
                                        (crumb, index, arr) => (
                                            <li
                                                key={crumb.path}
                                                className={
                                                    index === 0
                                                        ? "inline-flex items-center"
                                                        : ""
                                                }
                                                aria-current={
                                                    index === arr.length - 1
                                                        ? "page"
                                                        : undefined
                                                }
                                            >
                                                {index === 0 ? (
                                                    <button
                                                        onClick={() =>
                                                            navigateToBreadcrumb(
                                                                crumb.path
                                                            )
                                                        }
                                                        className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 "
                                                    >
                                                        <svg
                                                            className="w-3 h-3 me-2.5"
                                                            aria-hidden="true"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
                                                        </svg>
                                                        {crumb.name === "Inicio"
                                                            ? "Root"
                                                            : crumb.name}
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center">
                                                        <svg
                                                            className="rtl:rotate-180 block w-3 h-3 mx-1 text-gray-400"
                                                            aria-hidden="true"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 6 10"
                                                        >
                                                            <path
                                                                stroke="currentColor"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="m1 9 4-4-4-4"
                                                            />
                                                        </svg>
                                                        {index ===
                                                        arr.length - 1 ? (
                                                            <span className="ms-1 text-sm font-medium text-gray-500  ">
                                                                {crumb.name}
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() =>
                                                                    navigateToBreadcrumb(
                                                                        crumb.path
                                                                    )
                                                                }
                                                                className="ms-1 text-sm font-medium text-gray-700 hover:text-blue-600 "
                                                            >
                                                                {crumb.name}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        )
                                    )}
                                </ol>
                            </nav>

                            {items.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    El directorio está vacío
                                </p>
                            ) : (
                                <div className="grid gap-2">
                                    {items.map((item) => (
                                        <div
                                            key={item.name}
                                            className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">
                                                    {item.type === "folder"
                                                        ? "📁"
                                                        : "📄"}
                                                </span>
                                                <div>
                                                    <p className="font-medium">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {item.type === "file"
                                                            ? `${item.size} bytes`
                                                            : "Carpeta"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex space-x-2">
                                                {item.type === "folder" ? (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                changeDirectory(
                                                                    item.name
                                                                )
                                                            }
                                                            className="option-button blue"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0V0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M19 15l-6 6-1.42-1.41L15.17 16H4V4h2v10h9.17l-3.59-3.58L13 9l6 6z" />
                                                            </svg>
                                                            Abrir
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setShowMoveDialog(
                                                                    item
                                                                )
                                                            }
                                                            className="option-button orange"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0V0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12v-3h-4v-4h4V8l5 5-5 5z" />
                                                            </svg>
                                                            Mover
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                deleteItem(
                                                                    item.name,
                                                                    true
                                                                )
                                                            }
                                                            className="option-button red"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                            </svg>
                                                            Eliminar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                setShowFileContent(
                                                                    item
                                                                )
                                                            }
                                                            className="option-button blue"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                                            </svg>
                                                            Ver
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setShowEditFile(
                                                                    { ...item }
                                                                )
                                                            }
                                                            className="option-button yellow"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                            </svg>
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setShowFileProperties(
                                                                    item
                                                                )
                                                            }
                                                            className="option-button gray"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    clipRule="evenodd"
                                                                    d="M0 0h24v24H0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
                                                            </svg>
                                                            Propiedades
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setShowShareDialog(
                                                                    item
                                                                )
                                                            }
                                                            className="option-button purple"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                enableBackground="new 0 0 20 20"
                                                                height="20px"
                                                                viewBox="0 0 20 20"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <rect
                                                                    fill="none"
                                                                    height="20"
                                                                    width="20"
                                                                />
                                                                <path d="M13.17,17.5H4.95c-0.54,0-1.03-0.29-1.3-0.75l-1.9-3.31c-0.27-0.46-0.27-1.04,0-1.5L6.8,3.25C7.07,2.78,7.57,2.5,8.1,2.5 h3.8c0.53,0,1.03,0.28,1.3,0.75l3.69,6.34C16.6,9.53,16.3,9.5,16,9.5c-0.29,0-0.58,0.03-0.85,0.08L11.9,4H8.1l-5.05,8.69L4.95,16 h7.02C12.26,16.59,12.66,17.09,13.17,17.5z M19,13.25h-2.25V11h-1.5v2.25H13v1.5h2.25V17h1.5v-2.25H19V13.25z M7.69,12.45L10,8.42 l2.01,3.5c0.25-0.49,0.59-0.92,1-1.28l-2.29-4H9.29l-3.61,6.3l0.57,1h5.25c0.01-0.53,0.1-1.03,0.28-1.5H7.69z" />
                                                            </svg>
                                                            Compartir
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setShowCopyDialog(
                                                                    item
                                                                )
                                                            }
                                                            className="option-button cyan"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4l6 6v10c0 1.1-.9 2-2 2H7.99C6.89 23 6 22.1 6 21l.01-14c0-1.1.89-2 1.99-2h7zm-1 7h5.5L14 6.5V12z" />
                                                            </svg>
                                                            Copiar
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setShowMoveDialog(
                                                                    item
                                                                )
                                                            }
                                                            className="option-button orange"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0V0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12v-3h-4v-4h4V8l5 5-5 5z" />
                                                            </svg>
                                                            Mover
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                downloadFile(
                                                                    item
                                                                )
                                                            }
                                                            className="green option-button"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                                                            </svg>
                                                            Descargar
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                deleteItem(
                                                                    item.name,
                                                                    false
                                                                )
                                                            }
                                                            className="option-button red"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                height="20px"
                                                                viewBox="0 0 24 24"
                                                                width="20px"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    d="M0 0h24v24H0z"
                                                                    fill="none"
                                                                />
                                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                            </svg>
                                                            Eliminar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Shared Files Section */}
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h3 className="text-lg font-semibold mb-4">
                                Archivos Compartidos Contigo
                            </h3>
                            {(() => {
                                const sharedItems = fileSystem[user]?.structure[
                                    "/shared"
                                ]?.children
                                    ? Object.entries(
                                          fileSystem[user].structure["/shared"]
                                              .children
                                      ).map(([name, item]) => ({
                                          name,
                                          ...item,
                                      }))
                                    : [];
                                if (sharedItems.length === 0) {
                                    return (
                                        <p className="text-gray-500 text-center py-8">
                                            No tienes archivos compartidos
                                        </p>
                                    );
                                }
                                return (
                                    <div className="grid gap-2">
                                        {sharedItems.map((item) => (
                                            <div
                                                key={item.name}
                                                className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-2xl">
                                                        📄
                                                    </span>
                                                    <div>
                                                        <p className="font-medium">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {item.size} bytes
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() =>
                                                            setShowFileContent(
                                                                item
                                                            )
                                                        }
                                                        className=" option-button blue"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            height="20px"
                                                            viewBox="0 0 24 24"
                                                            width="20px"
                                                            fill="currentColor"
                                                        >
                                                            <path
                                                                d="M0 0h24v24H0z"
                                                                fill="none"
                                                            />
                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                                        </svg>
                                                        Ver
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setShowFileProperties(
                                                                item
                                                            )
                                                        }
                                                        className="option-button gray"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            height="20px"
                                                            viewBox="0 0 24 24"
                                                            width="20px"
                                                            fill="currentColor"
                                                        >
                                                            <path
                                                                clipRule="evenodd"
                                                                d="M0 0h24v24H0z"
                                                                fill="none"
                                                            />
                                                            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
                                                        </svg>
                                                        Propiedades
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            downloadFile(item)
                                                        }
                                                        className="green option-button "
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            height="20px"
                                                            viewBox="0 0 24 24"
                                                            width="20px"
                                                            fill="currentColor"
                                                        >
                                                            <path
                                                                d="M0 0h24v24H0z"
                                                                fill="none"
                                                            />
                                                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                                                        </svg>
                                                        Descargar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Modals */}

                {/* Create File Modal */}
                {showCreateFile && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold mb-4">
                                Crear Archivo
                            </h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Nombre del archivo"
                                    value={fileForm.name}
                                    onChange={(e) =>
                                        setFileForm({
                                            ...fileForm,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                <select
                                    value={fileForm.extension}
                                    onChange={(e) =>
                                        setFileForm({
                                            ...fileForm,
                                            extension: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="txt">txt</option>
                                    <option value="md">md</option>
                                    <option value="html">html</option>
                                    <option value="css">css</option>
                                    <option value="js">js</option>
                                </select>
                                <textarea
                                    placeholder="Contenido del archivo"
                                    value={fileForm.content}
                                    onChange={(e) =>
                                        setFileForm({
                                            ...fileForm,
                                            content: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md h-32"
                                />
                                <div className="flex space-x-3">
                                    <button
                                        onClick={createFile}
                                        className="flex-1 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                                    >
                                        Crear
                                    </button>
                                    <button
                                        onClick={() => setShowCreateFile(false)}
                                        className="flex-1 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Folder Modal */}
                {showCreateFolder && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold mb-4">
                                Crear Carpeta
                            </h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Nombre de la carpeta"
                                    value={folderForm.name}
                                    onChange={(e) =>
                                        setFolderForm({ name: e.target.value })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                <div className="flex space-x-3">
                                    <button
                                        onClick={createFolder}
                                        className="flex-1 bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
                                    >
                                        Crear
                                    </button>
                                    <button
                                        onClick={() =>
                                            setShowCreateFolder(false)
                                        }
                                        className="flex-1 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* File Content Modal */}
                {showFileContent && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96">
                            <h3 className="text-lg font-semibold mb-4">
                                Contenido de {showFileContent.name}
                            </h3>
                            <div className="mb-4">
                                <pre className="bg-gray-100 p-4 rounded-md overflow-auto h-64 text-sm">
                                    {showFileContent.content}
                                </pre>
                            </div>
                            <button
                                onClick={() => setShowFileContent(null)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* File Properties Modal */}
                {showFileProperties && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold mb-4">
                                Propiedades de {showFileProperties.name}
                            </h3>
                            <div className="space-y-2 text-sm">
                                <p>
                                    <strong>Nombre:</strong>{" "}
                                    {showFileProperties.name}
                                </p>
                                <p>
                                    <strong>Tamaño:</strong>{" "}
                                    {showFileProperties.size} bytes
                                </p>
                                <p>
                                    <strong>Creado:</strong>{" "}
                                    {new Date(
                                        showFileProperties.created
                                    ).toLocaleString()}
                                </p>
                                <p>
                                    <strong>Modificado:</strong>{" "}
                                    {new Date(
                                        showFileProperties.modified
                                    ).toLocaleString()}
                                </p>
                                {showFileProperties.sharedBy && (
                                    <p>
                                        <strong>Compartido por:</strong>{" "}
                                        {showFileProperties.sharedBy}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowFileProperties(null)}
                                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Edit File Modal */}
                {showEditFile && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                            <h3 className="text-lg font-semibold mb-4">
                                Editar {showEditFile.name}
                            </h3>
                            <textarea
                                value={showEditFile.content}
                                onChange={(e) =>
                                    setShowEditFile({
                                        ...showEditFile,
                                        content: e.target.value,
                                    })
                                }
                                className="w-full p-2 border border-gray-300 rounded-md h-64"
                            />
                            <div className="flex space-x-3 mt-4">
                                <button
                                    onClick={editFile}
                                    className="flex-1 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                                >
                                    Guardar
                                </button>
                                <button
                                    onClick={() => setShowEditFile(null)}
                                    className="flex-1 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Share Dialog Modal */}
                {showShareDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold mb-4">
                                Compartir {showShareDialog.name}
                            </h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Nombre del usuario"
                                    value={shareForm.targetUser}
                                    onChange={(e) =>
                                        setShareForm({
                                            targetUser: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() =>
                                            shareFile(showShareDialog.name)
                                        }
                                        className="flex-1 bg-purple-500 text-white p-2 rounded-md hover:bg-purple-600"
                                    >
                                        Compartir
                                    </button>
                                    <button
                                        onClick={() => setShowShareDialog(null)}
                                        className="flex-1 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Copy File Modal */}
                {showCopyDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold mb-4">
                                Copiar {showCopyDialog.name}
                            </h3>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Carpeta de destino:
                                </label>
                                <select
                                    value={copyMoveForm.targetPath}
                                    onChange={(e) =>
                                        setCopyMoveForm({
                                            targetPath: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    {true
                                        ? getAllPaths().map((path) => (
                                              <option key={path} value={path}>
                                                  {path === "/" ? "Raíz" : path}
                                              </option>
                                          ))
                                        : "    No hay rutas disponibles"}
                                </select>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={copyFile}
                                        className="flex-1 bg-cyan-500 text-white p-2 rounded-md hover:bg-cyan-600"
                                    >
                                        Copiar
                                    </button>
                                    <button
                                        onClick={() => setShowCopyDialog(null)}
                                        className="flex-1 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Move Item Modal */}
                {showMoveDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold mb-4">
                                Mover {showMoveDialog.name} (
                                {showMoveDialog.type === "folder"
                                    ? "Carpeta"
                                    : "Archivo"}
                                )
                            </h3>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Carpeta de destino:
                                </label>
                                <select
                                    value={copyMoveForm.targetPath}
                                    onChange={(e) =>
                                        setCopyMoveForm({
                                            targetPath: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    {true
                                        ? getAllPaths().map((path) => (
                                              <option key={path} value={path}>
                                                  {path === "/" ? "Raíz" : path}
                                              </option>
                                          ))
                                        : "No hay rutas disponibles"}
                                </select>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={moveItem}
                                        className="flex-1 bg-orange-500 text-white p-2 rounded-md hover:bg-orange-600"
                                    >
                                        Mover
                                    </button>
                                    <button
                                        onClick={() => setShowMoveDialog(null)}
                                        className="flex-1 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Load File Modal */}
                {showLoadFile && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold mb-4">
                                Cargar Archivo desde el Equipo
                            </h3>
                            <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <input
                                        type="file"
                                        accept=".txt,.md,.html,.css,.js,.json,.xml,text/*"
                                        onChange={handleFileLoad}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer flex flex-col items-center space-y-2"
                                    >
                                        <div className="text-4xl">📁</div>
                                        <div className="text-sm text-gray-600">
                                            Haz clic para seleccionar un archivo
                                            de texto
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Formatos soportados: txt, md, html,
                                            css, js, json, xml
                                        </div>
                                    </label>
                                </div>
                                <button
                                    onClick={() => setShowLoadFile(false)}
                                    className="w-full bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
