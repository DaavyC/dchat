export const MODULE_ID = "dchat";

export const MESSAGE_TYPES = {
    CHAT: "chat",
    GAME: "game",
    WHISPER: "whisper",
};

export const HOOK_NAMES = {
    INIT: "init",
    READY: "ready",
    I18N_INIT: "i18nInit",
    RENDER_SETTINGS_CONFIG: "renderSettingsConfig",
    RENDER_CHAT_INPUT: "renderChatInput",
    RENDER_CHAT_LOG: "renderChatLog",
    RENDER_SIDEBAR: "renderSidebar",
    CHANGE_SIDEBAR_TAB: "changeSidebarTab",
    OPEN_DETACHED_WINDOW: "openDetachedWindow",
    CLOSE_DETACHED_WINDOW: "closeDetachedWindow",
    RENDER_CHAT_MESSAGE_HTML: "renderChatMessageHTML",
    CREATE_CHAT_MESSAGE: "createChatMessage",
    PRE_CREATE_CHAT_MESSAGE: "preCreateChatMessage",
    DELETE_CHAT_MESSAGE: "deleteChatMessage"
};

export const SETTING_KEYS = {
    CLEANER_CHAT: "cleanerChat",
    HIDE_CHAT_FORMATTING: "hideChatFormatting",
    COLLAPSIBLE_FORMULA: "collapsibleFormula",
    COMPACT_CHAT: "compactChat",
    AUTOCOMPLETE_WHISPER: "autocompleteWhisper",
    HIDE_CHAT_INITIATIVE: "hideChatInitiative",
    HIDE_PRIVATE_MESSAGES: "hidePrivateMessages",
    HIDE_DAMAGE_TRAITS: "hideDamageTraits",
    TRAIT_FILTER: "traitFilter",
    HIDE_DAMAGE_BUTTONS: "hideDamageButtons",
    DEBUG: "debug"
};

export const SETTING_GROUPS = {
    Settings: [
        SETTING_KEYS.AUTOCOMPLETE_WHISPER,
        SETTING_KEYS.CLEANER_CHAT,
        SETTING_KEYS.COLLAPSIBLE_FORMULA,
        SETTING_KEYS.COMPACT_CHAT,
        SETTING_KEYS.HIDE_CHAT_FORMATTING,
        SETTING_KEYS.HIDE_CHAT_INITIATIVE,
        SETTING_KEYS.HIDE_PRIVATE_MESSAGES
    ],
    PF2eOnly: [
        SETTING_KEYS.HIDE_DAMAGE_BUTTONS,
        SETTING_KEYS.HIDE_DAMAGE_TRAITS,
        SETTING_KEYS.TRAIT_FILTER
    ],
    Advanced: [
        SETTING_KEYS.DEBUG
    ]
};

export const SETTING_DEFINITIONS = {
    [SETTING_KEYS.CLEANER_CHAT]: {
        name: "daavy-chat.Settings.cleanerChat.Name",
        hint: "daavy-chat.Settings.cleanerChat.Hint"
    },
    [SETTING_KEYS.HIDE_CHAT_FORMATTING]: {
        name: "daavy-chat.Settings.HideChatFormatting.Name",
        hint: "daavy-chat.Settings.HideChatFormatting.Hint"
    },
    [SETTING_KEYS.COLLAPSIBLE_FORMULA]: {
        name: "daavy-chat.Settings.CollapsibleFormula.Name",
        hint: "daavy-chat.Settings.CollapsibleFormula.Hint"
    },
    [SETTING_KEYS.COMPACT_CHAT]: {
        name: "daavy-chat.Settings.compactChat.Name",
        hint: "daavy-chat.Settings.compactChat.Hint"
    },
    [SETTING_KEYS.AUTOCOMPLETE_WHISPER]: {
        name: "daavy-chat.Settings.autocompleteWhisper.Name",
        hint: "daavy-chat.Settings.autocompleteWhisper.Hint"
    },
    [SETTING_KEYS.HIDE_CHAT_INITIATIVE]: {
        name: "daavy-chat.Settings.hideChatInitiative.Name",
        hint: "daavy-chat.Settings.hideChatInitiative.Hint",
        scope: "world"
    },
    [SETTING_KEYS.HIDE_PRIVATE_MESSAGES]: {
        name: "daavy-chat.Settings.HidePrivateMessages.Name",
        hint: "daavy-chat.Settings.HidePrivateMessages.Hint",
        scope: "world",
        restricted: true
    },
    [SETTING_KEYS.HIDE_DAMAGE_TRAITS]: {
        name: "daavy-chat.Settings.hideDamageTraits.Name",
        hint: "daavy-chat.Settings.hideDamageTraits.Hint"
    },
    [SETTING_KEYS.TRAIT_FILTER]: {
        name: "daavy-chat.Settings.traitFilter.Name",
        hint: "daavy-chat.Settings.traitFilter.Hint"
    },
    [SETTING_KEYS.HIDE_DAMAGE_BUTTONS]: {
        name: "daavy-chat.Settings.HideDamageButtons.Name",
        hint: "daavy-chat.Settings.HideDamageButtons.Hint"
    },
    [SETTING_KEYS.DEBUG]: {
        name: "daavy-chat.Settings.Debug.Name",
        hint: "daavy-chat.Settings.Debug.Hint",
        scope: "world",
        restricted: true
    }
};

export const FEATURE_CLASSES = {
    CLEANER_CHAT: "daavy-chat-cleaner-chat",
    HIDE_DAMAGE_TRAITS: "daavy-chat-hide-damage-traits",
    TRAIT_FILTER: "daavy-chat-trait-filter",
    COLLAPSIBLE_FORMULA: "daavy-chat-collapsible-formula",
    COMPACT_CHAT: "daavy-chat-compact-chat"
};

export const CHAT_TAB_CONFIG = [
    { id: MESSAGE_TYPES.CHAT, label: "daavy-chat.Tabs.Chat", icon: "fa-comments" },
    { id: MESSAGE_TYPES.GAME, label: "daavy-chat.Tabs.Game", icon: "fa-dice-d20" },
    { id: MESSAGE_TYPES.WHISPER, label: "daavy-chat.Tabs.Whispers", icon: "fa-lock" },
];

export const CHAT_SELECTORS = {
    SECTION: "#chat, [data-tab='chat']",
    CONTROLS: "#chat-controls",
    FORM: "#chat-form, form.chat-form",
    FOUNDRY_CLEAR_BUTTON: 'button[data-action="flush"]',
    FOUNDRY_CLEAR_ICON: ".fa-trash, .fa-trash-can",
    MESSAGE_LIST: "#chat-log, .chat-log, ol.chat-messages, [class*='chat-log']",
    TAB_BAR: ".daavy-chat-tab-bar",
    TAB_BUTTON: ".daavy-chat-tab-bar .daavy-chat-tab",
    TAB_DATA: "[data-daavy-chat-tab]",
    MESSAGE_ID: "[data-message-id]",
    SCOPED_CLEAR: ".daavy-chat-scoped-clear",
    PIP: ".daavy-chat-pip"
};

export const CHAT_CLASSES = {
    MODULE_TOOLBAR: "daavy-chat-module-toolbar",
    TAB_BAR: "daavy-chat-tab-bar split-button",
    TAB_BUTTON: "daavy-chat-tab",
    ACTIVE: "active",
    PIP: "daavy-chat-pip",
    SCOPED_CLEAR: "ui-control icon fas fa-trash daavy-chat-scoped-clear",
    FILTER_PREFIX: "daavy-chat-filter"
};

export const CHAT_DATA = {
    TAB: "daavyChatTab",
    TYPE: "daavy-chat-type"
};

export const CHAT_SELECTOR_FACTORIES = {
    TAB_BUTTON_BY_ID: (tabId) => `.${CHAT_CLASSES.TAB_BUTTON}[data-daavy-chat-tab="${tabId}"]`
};

export const CHAT_I18N = {
    TABS_ALL: "daavy-chat.Tabs.All",
    TABS_CHAT: "daavy-chat.Tabs.Chat",
    CLEAR_TOOLTIP: "daavy-chat.Clear.Tooltip",
    CLEAR_NO_MESSAGES: "daavy-chat.Clear.NoMessages",
    CLEAR_SUCCESS: "daavy-chat.Clear.Success",
    CLEAR_TITLE: "daavy-chat.Clear.Title",
    CLEAR_CONFIRM: "daavy-chat.Clear.Confirm"
};

export const CHAT_BATCH_SIZE = 100;

export const SETTINGS_CLASSES = {
    ROW: "daavy-chat-settings-row",
    GROUP: "daavy-chat-settings-group",
    GROUP_TITLE: "daavy-chat-settings-group-title"
};

export const SETTINGS_SELECTORS = {
    FORM_GROUP: ".form-group"
};

export const SETTINGS_SELECTOR_FACTORIES = {
    ROW: (settingId) => `[data-setting-id="${settingId}"]`,
    INPUT: (settingId) => `[id$="${settingId}"]`
};

export const SETTINGS_I18N = {
    GROUP_PREFIX: "daavy-chat.Settings.Groups"
};

export const RESET_DIALOG = {
    MENU_KEY: "resetSettings",
    MENU_ICON: "fas fa-layer-group",
    I18N_PREFIX: "daavy-chat.Settings.Reset",
    YES_ACTION: "yes",
    NO_ACTION: "no",
    YES_ICON: "fa-solid fa-check",
    NO_ICON: "fa-solid fa-xmark"
};

export const CLEANER_CHAT_SELECTORS = {
    AVATARS: "header img, .message-header img, .message-portrait, [class*='portrait']",
    USERS: "header span.user, .message-header span.user",
    ROLL_TITLE: ".dice-roll h4",
    ROLL: ".dice-roll",
    FORMULA: ".dice-formula"
};

export const CLEANER_CHAT_CLASSES = {
    SHOW_FORMULA: "daavy-chat-show",
    HIDE_CHAT_FORMATTING: "daavy-chat-hide-chat-formatting"
};

export const CHAT_EDITOR_SELECTORS = {
    PROSE_MIRROR: "prose-mirror[name='message']"
};

export const AUTOCOMPLETE_WHISPER = {
    HOST_SELECTOR: "#chat-notifications, #chat-form, form.chat-form",
    EDITOR_SELECTOR: "prose-mirror[name='message'], prose-mirror, .editor-content[contenteditable='true'], [contenteditable='true']",
    MESSAGE_EDITOR_SELECTOR: "prose-mirror[name='message'], prose-mirror",
    EDITABLE_SELECTOR: ".editor-content[contenteditable='true'], [contenteditable='true']",
    MAX_RESULTS: 6,
    STARTUP_REFRESH_DELAYS_MS: [0, 150, 500, 1200, 2500, 5000],
    BOOTSTRAP_INTERVAL_MS: 500,
    MAX_BOOTSTRAP_ATTEMPTS: 20,
    CARET_NAVIGATION_KEYS: ["ArrowLeft", "ArrowRight", "Home", "End"],
    DEFAULT_ASSISTANT_ROLE: 3,
    DEFAULT_GM_ROLE: 4,
    PREFIX_PATTERN: /^(\/w|\/whisper)\s+/i,
    HOST_CLASS: "daavy-chat-whisper-autocomplete-host",
    POPUP_CLASS: "daavy-chat-whisper-autocomplete",
    VISIBLE_CLASS: "visible",
    POPUP_ID_PREFIX: "daavy-chat-whisper",
    OPTION_CLASS: "daavy-chat-whisper-option",
    ACTIVE_OPTION_CLASS: "active",
    STATUS_CLASS: "daavy-chat-whisper-status",
    ACTIVE_STATUS_CLASS: "is-active",
    NAME_CLASS: "daavy-chat-whisper-name",
    INDEX_DATA: "daavyChatWhisperIndex",
    INDEX_SELECTOR: "[data-daavy-chat-whisper-index]",
    EDITABLE_ARIA_ATTRIBUTES: [
        "aria-activedescendant",
        "aria-autocomplete",
        "aria-haspopup",
        "aria-controls",
        "aria-expanded"
    ]
};

export const PF2E_SELECTORS = {
    DAMAGE_ROLL: ".damage-roll",
    DAMAGE_TRAITS: '.flavor-text .tags[data-tooltip-class="pf2e"]',
    DAMAGE_TRAITS_SEPARATOR: ".flavor-text > hr:first-of-type",
    TRAIT_TAGS: '.tags .tag:is([data-trait], [data-slug]):not(.tag_transparent)[data-tooltip]',
    TRAIT_CONTAINERS: ".tags",
    VISIBLE_TRAIT_TAGS: "span.tag:is([data-trait], [data-slug]):not(.tag_transparent)",
    CLICKABLE_TRAIT_TAG: "span.tag.daavy-chat-clickable",
    DAMAGE_BUTTONS: "button.success[data-action='strike-damage'], button.critical-success[data-action='strike-damage']",
    MESSAGE_METADATA: ".message-metadata",
    MESSAGE_DELETE: ".message-delete",
    TOGGLE_DAMAGE_BUTTONS: ".daavy-chat-toggle-buttons"
};

export const PF2E_CLASSES = {
    FILTERED_TRAIT: "daavy-chat-filtered",
    CLICKABLE_TRAIT: "daavy-chat-clickable",
    HIDDEN_TRAIT: "daavy-chat-hidden",
    EXPANDED_TRAITS: "daavy-chat-expanded",
    HIDDEN_DAMAGE_BUTTONS: "daavy-chat-buttons-hidden",
    TOGGLE_DAMAGE_BUTTONS: "daavy-chat-toggle-buttons"
};

export const PF2E_DATA = {
    TRAITS_LIMITED: "daavyChatLimited",
    DAMAGE_BUTTONS_PROCESSED: "daavyChatButtonsProcessed"
};

export const PF2E_LIMITS = {
    VISIBLE_TRAITS: 3
};

export const PF2E_I18N = {
    SHOW_DAMAGE_BUTTONS: "daavy-chat.HideDamageButtons.Show",
    HIDE_DAMAGE_BUTTONS: "daavy-chat.HideDamageButtons.Hide",
    TOGGLE_DAMAGE_BUTTONS: "daavy-chat.HideDamageButtons.ToggleLabel"
};

export const PF2E_ICONS = {
    DAMAGE_BUTTONS_HIDDEN: "fa-solid fa-eye-slash",
    DAMAGE_BUTTONS_VISIBLE: "fa-solid fa-eye"
};

export const PF2E_TRAITS_TO_HIDE = [
    "common", "uncommon", "rare", "unique",
    "spellshot", "archetype", "class", "general", "skill", "aiuvarin", "anadi", "android",
    "aphorite", "ardande", "astrazoan", "athamaru", "automaton", "awakened-animal", "barathu",
    "beastkin", "borai", "centaur", "changeling", "conrasu", "contemplative", "hryngar",
    "dragonblood", "dragonkin", "dromaar", "dwarf", "elf", "elebrian", "fetchling", "fleshwarp",
    "ganzi", "geniekin", "ghoran", "kholo", "gnome", "goblin", "goloma", "tripkee", "halfling",
    "human", "hungerseed", "ikeshti", "jotunborn", "kalo", "kasatha", "kashrishi", "khizar",
    "kitsune", "lashunta", "leshy", "lizardfolk", "merfolk", "minotaur", "naari", "nagaji",
    "nephilim", "orc", "oread", "pahtra", "poppet", "reflection", "samsaran", "sarangay",
    "sarcesian", "shirren", "shisk", "shobhad", "shoony", "skittermander", "strix", "suli",
    "surki", "sylph", "talos", "tanuki", "undine", "vanara", "vesk", "vishkanya", "vlaka",
    "wayang", "yaksha", "yaoguai", "alchemist", "animist", "barbarian", "bard", "champion",
    "cleric", "commander", "druid", "envoy", "exemplar", "fighter", "guardian", "gunslinger",
    "inventor", "investigator", "kineticist", "magus", "monk", "mystic", "operative", "oracle",
    "psychic", "ranger", "rogue", "solarian", "soldier", "sorcerer", "summoner", "swashbuckler",
    "thaumaturge", "witch", "witchwarper", "wizard", "aberration", "animal", "astral", "beast",
    "celestial", "dragon", "dream", "elemental", "ethereal", "experiment", "fey", "fiend",
    "fungus", "giant", "humanoid", "monitor", "ooze", "petitioner", "plant", "sea-devil",
    "shade", "arcane", "divine", "occult", "primal", "aeon", "aesir", "agathion", "angel",
    "anugobu", "archon", "asura", "azarketi", "azata", "blight", "boggard", "bugbear",
    "caligni", "catfolk", "charau-ka", "corpsefolk", "coatl", "daemon", "darvakka", "demon",
    "dero", "devil", "dhampir", "dinosaur", "div", "drow", "drift", "duskwalker", "formian",
    "genie", "ghost", "ghoul", "ghul", "gigas", "graveknight", "gremlin", "grioth", "hag",
    "hantu", "herald", "hobgoblin", "inevitable", "jinsul", "kaiju", "kami", "kobold",
    "kovintus", "kucharn", "lilu", "mindless", "morlock", "mortic", "mummy", "munavri",
    "mutant", "nindoru", "nymph", "oni", "paaridar", "palinthanos", "phantom", "protean",
    "psychopomp", "qlippoth", "rakshasa", "ratfolk", "robot", "sahkil", "sedacthy",
    "serpentfolk", "seugathi", "shabti", "siktempora", "skeleton", "skelm", "skulk",
    "soulbound", "spectra", "sporeborn", "spriggan", "sprite", "stheno", "tane", "tanggal",
    "tengu", "titan", "time", "troll", "urdefhan", "vampire", "velstrac", "werecreature",
    "wight", "wild-hunt", "wraith", "wraithvine", "wyrwood", "xulgath", "zombie",
    "pervasive-magic", "stamina", "apparition", "attuned", "composite", "eidolon", "evolution",
    "ikon", "modification", "oath", "wandering", "adjustment", "companion", "relic", "aftermath",
    "dedication", "deviant", "lineage", "multiclass", "reincarnated", "calling", "destiny",
    "brandish", "esoterica", "artifact", "precious", "processed", "exposed", "breakdown",
    "powered", "extradimensional", "holy", "sanctified", "tech", "teleportation", "unholy",
    "contact", "ingested", "inhaled", "injury", "vitality", "void", "spirit", "cosmic",
    "circus", "harrow-court", "civic", "commerce", "leadership", "region", "upkeep",
    "alchemical", "biotech", "elixir", "gadget", "intelligent", "magitech", "mechanical",
    "nanite", "necrograft", "oil", "potion", "serum", "steam", "detection", "emotion",
    "healing", "prediction", "radiation", "revelation", "scrying", "sleep", "technological",
    "illusion", "air", "earth", "fire", "metal", "water", "wood", "acid", "cold", "electricity",
    "force", "sonic", "shadow", "persona-flirt", "persona-guardian", "persona-leader",
    "persona-scholar", "persona-scoundrel", "persona-underdog", "persona-warrior",
    "persona-wildcard", "environmental", "army", "cavalry", "infantry", "siege", "skirmisher"
];
