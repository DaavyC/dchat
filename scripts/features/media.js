import { MODULE_ID, SETTINGS } from "../constants.js";
import { isSettingEnabled } from "../settings.js";
import { getElement, isCurrentUserAuthor } from "../utils.js";

const IMAGE_FILE_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/gif"]);
const IMAGE_FILE_NAMES = /\.(?:png|webp|jpe?g|gif)$/i;
const IMAGE_MAX_EDGE = 2048;
const IMAGE_WEBP_QUALITY = 0.82;
const IMAGE_UPLOAD_TIMEOUT = 60_000;

export class ImageUpload {
    static _pendingFiles = new Map();
    static _processingMessages = new Set();
    static _uploadRequests = new Map();

    static isProcessing(message) {
        return this._processingMessages.has(message?.id);
    }

    static processMessage(message, renderedHtml) {
        const element = getElement(renderedHtml);
        if (!element) return;

        element.querySelectorAll(".message-content img:not(.nopopout)").forEach(image => {
            if (image.classList.contains("daavy-chat-image-popout")) return;

            image.classList.add("daavy-chat-image-popout");
            image.addEventListener("click", () => this._openImage(message, image));
        });
    }

    static _openImage(message, image) {
        new foundry.applications.apps.ImagePopout({
            src: image.currentSrc || image.src,
            uuid: message?.uuid,
            window: { title: message?.alias || message?.author?.name || image.alt || "Chat Image" }
        }).render({force: true});
    }

    static onReady() {
        game.socket.on(`module.${MODULE_ID}`, (payload, senderId) => this._onSocket(payload, senderId));
    }

    static async _onSocket(payload, senderId) {
        if (payload?.type === "dchatImageUploadResponse" && payload.userId === game.user?.id) {
            const request = this._uploadRequests.get(payload.requestId);
            if (!request || request.gmId !== senderId) return;

            if (payload.error) request.reject(new Error(payload.error));
            else request.resolve(payload.path);
            return;
        }

        if (payload?.type !== "dchatImageUploadRequest"
            || senderId !== payload.userId
            || !game.user?.isGM
            || payload.gmId !== game.user.id) return;

        let message;
        const response = {
            type: "dchatImageUploadResponse",
            requestId: payload.requestId,
            userId: payload.userId
        };
        try {
            message = await fromUuid(payload.messageUuid);
            if (!message || message.author?.id !== payload.userId) {
                throw new Error("Chat message could not be verified.");
            }
            if (payload.userId !== game.user.id && !isSettingEnabled(SETTINGS.ALLOW_PLAYER_MEDIA.key)) {
                throw new Error("Player media uploads are disabled.");
            }
            if (!payload.src || !message.content?.includes(payload.src)) {
                throw new Error("Chat image is no longer pending.");
            }
            if (!/^data:image\/(?:png|webp|jpe?g|gif);base64,/i.test(payload.src)) {
                throw new Error("Invalid chat image data.");
            }

            this._processingMessages.add(message.id);
            const file = await fileFromDataUrl(payload.src, payload.fileName, payload.fileType);
            if (!isImageFile(file)) throw new Error("Unsupported chat image format.");

            response.path = await uploadImage(message, file, {notify: false});
            if (!response.path) throw new Error("GM upload returned no file path.");
        } catch (error) {
            response.error = error.message || "GM could not upload the chat image.";
        } finally {
            this._processingMessages.delete(message?.id);
        }

        game.socket.emit(`module.${MODULE_ID}`, response, {recipients: [payload.userId]});
    }

    static async onCreateMessage(message) {
        if (!isCurrentUserAuthor(message)) return;

        const template = globalThis.document?.createElement("template");
        if (!template) return;

        template.innerHTML = message.content ?? "";
        const pending = new Map();
        for (const image of template.content.querySelectorAll("img[src]")) {
            const src = image.getAttribute("src");
            const file = this._pendingFiles.get(src);
            if (file) pending.set(src, file);
        }
        if (!pending.size) return;

        this._processingMessages.add(message.id);
        try {
            const uploaded = new Map();
            for (const [src, file] of pending) {
                try {
                    const path = game.user?.isGM
                        ? await uploadImage(message, file, {notify: false})
                        : await this._requestUpload(message, src, file);
                    if (path) uploaded.set(src, path);
                } catch (error) {
                    this._notifyUploadError(error);
                }
            }

            for (const image of template.content.querySelectorAll("img[src]")) {
                const src = image.getAttribute("src");
                if (!pending.has(src)) continue;

                const path = uploaded.get(src);
                if (path) image.setAttribute("src", path);
                else image.remove();
            }

            const content = template.innerHTML;
            if (content !== message.content) await message.update({content});
        } catch (error) {
            console.error("dchat | Unable to finish mediated chat image upload.", error);
        } finally {
            pending.keys().forEach(src => this._pendingFiles.delete(src));
            this._processingMessages.delete(message.id);
        }
    }

    static async _requestUpload(message, src, file) {
        const gm = game.users?.activeGM;
        if (!gm) throw new Error("No active GM is available to upload chat images.");

        const requestId = foundry.utils.randomID();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._uploadRequests.delete(requestId);
                reject(new Error("The active GM did not complete the chat image upload in time."));
            }, IMAGE_UPLOAD_TIMEOUT);

            this._uploadRequests.set(requestId, {
                gmId: gm.id,
                resolve: path => {
                    clearTimeout(timeout);
                    this._uploadRequests.delete(requestId);
                    resolve(path);
                },
                reject: error => {
                    clearTimeout(timeout);
                    this._uploadRequests.delete(requestId);
                    reject(error);
                }
            });

            try {
                game.socket.emit(`module.${MODULE_ID}`, {
                    type: "dchatImageUploadRequest",
                    requestId,
                    userId: game.user.id,
                    gmId: gm.id,
                    messageUuid: message.uuid,
                    src,
                    fileName: file.name,
                    fileType: file.type
                }, {recipients: [gm.id]});
            } catch (error) {
                this._uploadRequests.get(requestId)?.reject(error);
            }
        });
    }

    static init() {
        Hooks.on("createProseMirrorEditor", (_uuid, plugins) => {
            plugins.dchatImageUpload = new foundry.prosemirror.Plugin({
                props: {
                    handlePaste: (view, event) => {
                        const files = getImageFiles(event.clipboardData);
                        if (!files.length) return;

                        this._uploadFiles(view, files);
                        return true;
                    },
                    handleDrop: (view, event, _slice, moved) => {
                        if (moved) return;

                        const files = getImageFiles(event.dataTransfer);
                        if (!files.length) return;

                        const position = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY
                        });
                        if (!position) return;

                        this._uploadFiles(view, files, position.pos);
                        return true;
                    }
                }
            });
        });
    }

    static async _uploadFiles(view, files, position) {
        if (!game.user?.isGM && !isSettingEnabled(SETTINGS.ALLOW_PLAYER_MEDIA.key)) {
            ui.notifications.warn("Player media uploads are disabled.");
            return;
        }

        view.focus();
        let insertPosition = position;

        for (const file of files) {
            try {
                const compressed = await compressImage(file);
                const src = await readAsDataUrl(compressed);
                this._pendingFiles.set(src, compressed);

                const image = view.state.schema.nodes.image.create({src});
                if (insertPosition === undefined) {
                    insertPosition = view.state.selection.from;
                    view.dispatch(view.state.tr.replaceSelectionWith(image));
                } else {
                    view.dispatch(view.state.tr.insert(insertPosition, image));
                }
                insertPosition += 2;
            } catch (error) {
                this._notifyUploadError(error);
            }
        }
    }

    static _notifyUploadError(error) {
        console.error("dchat | Unable to prepare chat image for GM upload.", error);
        ui.notifications.error(error?.message || "Unable to process chat image.");
    }
}

function getImageFiles(dataTransfer) {
    const source = dataTransfer?.files?.length ? dataTransfer.files : dataTransfer?.items ?? [];
    return Array.from(source, item => item.kind === undefined ? item : item.getAsFile?.())
        .filter(Boolean)
        .filter(isImageFile);
}

async function compressImage(file) {
    if (file.type === "image/gif" || /\.gif$/i.test(file.name ?? "")) return file;
    if (typeof globalThis.createImageBitmap !== "function") {
        throw new Error("Image compression is not supported by this browser.");
    }

    let bitmap;
    try {
        bitmap = await globalThis.createImageBitmap(file, {imageOrientation: "from-image"});
        if (!bitmap.width || !bitmap.height) throw new Error("Unable to read image dimensions.");

        const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
        const canvas = globalThis.document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(result => result ? resolve(result) : reject(new Error("Image compression failed.")),
                "image/webp", IMAGE_WEBP_QUALITY);
        });
        return new File([blob], "dchat-image.webp", {type: "image/webp"});
    } finally {
        bitmap?.close?.();
    }
}

function isImageFile(file) {
    return IMAGE_FILE_TYPES.has(file.type) || IMAGE_FILE_NAMES.test(file.name ?? "");
}

async function fileFromDataUrl(src, name, type) {
    const response = await fetch(src);
    const blob = await response.blob();
    return new File([blob], name || "dchat-image", {type: blob.type || type});
}

async function uploadImage(message, file, {notify = true} = {}) {
    const upload = new File([file], `${message.id}-${file.name}`, {type: file.type});
    if (notify) return foundry.applications.ux.TextEditor.implementation._uploadImage(message.uuid, upload);

    const response = await foundry.applications.apps.FilePicker.upload(
        null,
        null,
        upload,
        {uuid: message.uuid},
        {notify: false}
    );
    return response?.path;
}

function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read image file."));
        reader.readAsDataURL(blob);
    });
}
