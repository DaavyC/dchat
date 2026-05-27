export function getSuggestions(match, users, maxResults) {
    const normalizedQuery = normalizeName(match.query);
    const selectedNames = new Set(match.selectedNames.map(normalizeName));

    return sortUsersByWhisperPriority(getUniqueCandidateUsers(users, selectedNames))
        .filter(user => matchesQuery(user, normalizedQuery))
        .slice(0, maxResults)
        .map(toSuggestion);
}

export function normalizeName(name) {
    return (name ?? "").trim().toLocaleLowerCase();
}

function getDisplayName(user) {
    return user?.name?.trim() ?? "";
}

function getUniqueCandidateUsers(users, selectedNames) {
    const seen = new Set();

    return users.filter(user => {
        const name = getDisplayName(user);
        const normalizedName = normalizeName(name);
        if (!name || !normalizedName || seen.has(normalizedName) || selectedNames.has(normalizedName)) return false;

        seen.add(normalizedName);
        return true;
    });
}

function sortUsersByWhisperPriority(users) {
    return users.sort((a, b) => {
        const aName = getDisplayName(a);
        const bName = getDisplayName(b);
        if (a.active !== b.active) return a.active ? -1 : 1;

        const rolePriority = getRolePriority(a) - getRolePriority(b);
        if (rolePriority !== 0) return rolePriority;

        return aName.localeCompare(bName, game.i18n.lang, { sensitivity: "base" });
    });
}

function getRolePriority(user) {
    const roles = globalThis.CONST?.USER_ROLES ?? {};
    const assistantRole = roles.ASSISTANT ?? 3;
    const gmRole = roles.GAMEMASTER ?? 4;
    const role = Number(user?.role ?? 0);

    if (user?.isGM || role >= gmRole) return 0;
    if (role >= assistantRole) return 1;
    return 2;
}

function matchesQuery(user, normalizedQuery) {
    const normalizedName = normalizeName(getDisplayName(user));
    return !normalizedQuery || normalizedName.includes(normalizedQuery);
}

function toSuggestion(user) {
    return {
        id: user.id,
        name: getDisplayName(user),
        active: !!user.active
    };
}
