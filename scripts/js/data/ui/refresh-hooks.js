// Registers chat refresh hooks for a manager.
export function registerChatRefreshHooks(manager) {
    Hooks.on("renderChatInput", (app) => {
        manager.refresh(app?.element);
    });

    Hooks.on("changeSidebarTab", (app) => {
        if (app?.tabName === "chat") manager.refresh(app?.element);
    });

    Hooks.on("openDetachedWindow", () => {
        manager._scheduleRefresh();
    });

    Hooks.on("closeDetachedWindow", () => {
        manager._scheduleRefresh();
    });
}
