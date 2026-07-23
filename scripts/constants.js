export const MODULE_ID = "dchat";

export const PIN_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/main.hbs`;
export const FEEDBACK_ACTIONS_CLASS = "daavy-chat-settings-actions";
export const PROSE_MIRROR_SELECTOR = "prose-mirror[name='message']";

export const MESSAGE_TYPES = {
    CHAT: "chat",
    GAME: "game",
    WHISPER: "whisper",
};

export const SETTINGS = {
    CLEANER_CHAT: {
        key: "cleanerChat",
        name: "daavy-chat.Settings.cleanerChat.Name",
        hint: "daavy-chat.Settings.cleanerChat.Hint"
    },
    HIDE_CHAT_FORMATTING: {
        key: "hideChatFormatting",
        name: "daavy-chat.Settings.HideChatFormatting.Name",
        hint: "daavy-chat.Settings.HideChatFormatting.Hint"
    },
    COLLAPSIBLE_FORMULA: {
        key: "collapsibleFormula",
        name: "daavy-chat.Settings.CollapsibleFormula.Name",
        hint: "daavy-chat.Settings.CollapsibleFormula.Hint"
    },
    COMPACT_CHAT: {
        key: "compactChat",
        name: "daavy-chat.Settings.compactChat.Name",
        hint: "daavy-chat.Settings.compactChat.Hint"
    },
    AUTOCOMPLETE_WHISPER: {
        key: "autocompleteWhisper",
        name: "daavy-chat.Settings.autocompleteWhisper.Name",
        hint: "daavy-chat.Settings.autocompleteWhisper.Hint"
    },
    HIDE_CHAT_INITIATIVE: {
        key: "hideChatInitiative",
        name: "daavy-chat.Settings.hideChatInitiative.Name",
        hint: "daavy-chat.Settings.hideChatInitiative.Hint",
        scope: "world"
    },
    HIDE_PRIVATE_MESSAGES: {
        key: "hidePrivateMessages",
        name: "daavy-chat.Settings.HidePrivateMessages.Name",
        hint: "daavy-chat.Settings.HidePrivateMessages.Hint",
        scope: "world",
        restricted: true
    },
    HIDE_DAMAGE_TRAITS: {
        key: "hideDamageTraits",
        name: "daavy-chat.Settings.hideDamageTraits.Name",
        hint: "daavy-chat.Settings.hideDamageTraits.Hint"
    },
    TRAIT_FILTER: {
        key: "traitFilter",
        name: "daavy-chat.Settings.traitFilter.Name",
        hint: "daavy-chat.Settings.traitFilter.Hint"
    },
    HIDE_DAMAGE_BUTTONS: {
        key: "hideDamageButtons",
        name: "daavy-chat.Settings.HideDamageButtons.Name",
        hint: "daavy-chat.Settings.HideDamageButtons.Hint"
    }
};

export const SETTING_GROUPS = {
    Settings: [
        SETTINGS.AUTOCOMPLETE_WHISPER.key,
        SETTINGS.CLEANER_CHAT.key,
        SETTINGS.COLLAPSIBLE_FORMULA.key,
        SETTINGS.COMPACT_CHAT.key,
        SETTINGS.HIDE_CHAT_FORMATTING.key,
        SETTINGS.HIDE_CHAT_INITIATIVE.key,
        SETTINGS.HIDE_PRIVATE_MESSAGES.key
    ],
    PF2eOnly: [
        SETTINGS.HIDE_DAMAGE_BUTTONS.key,
        SETTINGS.HIDE_DAMAGE_TRAITS.key,
        SETTINGS.TRAIT_FILTER.key
    ]
};

export const SETTINGS_CLASSES = {
    ROW: "daavy-chat-settings-row",
    GROUP: "daavy-chat-settings-group",
    GROUP_TITLE: "daavy-chat-settings-group-title"
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
    { id: MESSAGE_TYPES.WHISPER, label: "daavy-chat.Tabs.Whispers", icon: "fa-user-secret" },
];

export const CHAT_SELECTORS = {
    SECTION: "#chat, [data-tab='chat']",
    CONTROLS: "#chat-controls",
    FORM: "#chat-form, form.chat-form",
    FOUNDRY_CLEAR_BUTTON: 'button[data-action="flush"]',
    MESSAGE_LIST: "#chat-log, .chat-log, ol.chat-messages, [class*='chat-log']",
    TAB_BAR: ".daavy-chat-tab-bar",
    TAB_BUTTON: ".daavy-chat-tab-bar .daavy-chat-tab",
    TAB_DATA: "[data-daavy-chat-tab]",
    MESSAGE_ID: "[data-message-id]",
    MESSAGE_METADATA: ".message-metadata",
    MESSAGE_DELETE: ".message-delete",
    PIN_TOGGLE: ".daavy-chat-pin-toggle",
    PIN_MANAGER: ".daavy-chat-pin-manager",
    SCOPED_CLEAR: ".daavy-chat-scoped-clear",
    PIP: ".daavy-chat-pip",
    WHISPER_TARGET: ".daavy-chat-whisper-target"
};

export const CHAT_CLASSES = {
    MODULE_TOOLBAR: "daavy-chat-module-toolbar",
    TAB_BAR: "daavy-chat-tab-bar split-button",
    TAB_BUTTON: "daavy-chat-tab",
    ACTIVE: "active",
    PIP: "daavy-chat-pip",
    PINNED: "daavy-chat-pinned",
    PIN_TOGGLE: "daavy-chat-pin-toggle",
    PIN_MANAGER: "ui-control icon fas fa-thumbtack daavy-chat-pin-manager",
    SCOPED_CLEAR: "ui-control icon fas fa-trash daavy-chat-scoped-clear",
    WHISPER_TARGET: "daavy-chat-whisper-target",
    FILTER_PREFIX: "daavy-chat-filter"
};

export const AUTOCOMPLETE_WHISPER = {
    HOST_SELECTOR: "#chat-notifications, #chat-form, form.chat-form",
    EDITOR_SELECTOR: "prose-mirror[name='message'], prose-mirror, .editor-content[contenteditable='true'], [contenteditable='true']",
    MESSAGE_EDITOR_SELECTOR: "prose-mirror[name='message'], prose-mirror",
    EDITABLE_SELECTOR: ".editor-content[contenteditable='true'], [contenteditable='true']",
    MAX_RESULTS: 6,
    CARET_NAVIGATION_KEYS: ["ArrowLeft", "ArrowRight", "Home", "End"],
    PREFIX_PATTERN: /^(\/w|\/whisper)\s+/i,
    HOST_CLASS: "daavy-chat-whisper-autocomplete-host",
    POPUP_CLASS: "daavy-chat-whisper-autocomplete",
    POPUP_ID_PREFIX: "daavy-chat-whisper",
    OPTION_CLASS: "daavy-chat-whisper-option",
    ACTIVE_OPTION_CLASS: CHAT_CLASSES.ACTIVE,
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

export const CHAT_DATA = {
    TAB: "daavyChatTab",
    TYPE: "daavy-chat-type"
};

export const PF2E_CLASSES = {
    FILTERED_TRAIT: "daavy-chat-filtered",
    CLICKABLE_TRAIT: "daavy-chat-clickable",
    HIDDEN_TRAIT: "daavy-chat-hidden",
    EXPANDED_TRAITS: "daavy-chat-expanded",
    HIDDEN_DAMAGE_BUTTONS: "daavy-chat-buttons-hidden",
    TOGGLE_DAMAGE_BUTTONS: "daavy-chat-toggle-buttons"
};

export const PF2E_SELECTORS = {
    TRAIT_TAGS: '.tags .tag:is([data-trait], [data-slug]):not(.tag_transparent)[data-tooltip]',
    TRAIT_CONTAINERS: ".tags",
    VISIBLE_TRAIT_TAGS: "span.tag:is([data-trait], [data-slug]):not(.tag_transparent)",
    CLICKABLE_TRAIT_TAG: `span.tag.${PF2E_CLASSES.CLICKABLE_TRAIT}`,
    DAMAGE_BUTTONS: "button.success[data-action='strike-damage'], button.critical-success[data-action='strike-damage']",
    MESSAGE_METADATA: CHAT_SELECTORS.MESSAGE_METADATA,
    MESSAGE_DELETE: CHAT_SELECTORS.MESSAGE_DELETE,
    TOGGLE_DAMAGE_BUTTONS: `.${PF2E_CLASSES.TOGGLE_DAMAGE_BUTTONS}`
};

export const PF2E_DATA = {
    TRAITS_LIMITED: "daavyChatLimited",
    DAMAGE_BUTTONS_PROCESSED: "daavyChatButtonsProcessed"
};

export const PF2E_VISIBLE_TRAIT_LIMIT = 3;

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
