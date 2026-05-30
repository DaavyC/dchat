export const MODULE_ID = "dchat";

export const MESSAGE_TYPES = {
    CHAT: "chat",
    GAME: "game",
    WHISPER: "whisper",
};

export const SETTING_KEYS = {
    CLEANER_CHAT: "cleanerChat",
    COLLAPSIBLE_FORMULA: "collapsibleFormula",
    COMPACT_CHAT: "compactChat",
    AUTOCOMPLETE_WHISPER: "autocompleteWhisper",
    HIDE_CHAT_INITIATIVE: "hideChatInitiative",
    HIDE_PRIVATE_MESSAGES: "hidePrivateMessages",
    HIDE_DAMAGE_TRAITS: "hideDamageTraits",
    TRAIT_FILTER: "traitFilter",
    HIDE_DAMAGE_BUTTONS: "hideDamageButtons"
};

export const SETTING_GROUPS = {
    Settings: [
        SETTING_KEYS.CLEANER_CHAT,
        SETTING_KEYS.COLLAPSIBLE_FORMULA,
        SETTING_KEYS.COMPACT_CHAT,
        SETTING_KEYS.AUTOCOMPLETE_WHISPER,
        SETTING_KEYS.HIDE_CHAT_INITIATIVE,
        SETTING_KEYS.HIDE_PRIVATE_MESSAGES
    ],
    PF2eOnly: [
        SETTING_KEYS.HIDE_DAMAGE_TRAITS,
        SETTING_KEYS.TRAIT_FILTER,
        SETTING_KEYS.HIDE_DAMAGE_BUTTONS
    ]
};

export const SETTING_DEFINITIONS = {
    [SETTING_KEYS.CLEANER_CHAT]: {
        name: "DCHAT.Settings.cleanerChat.Name",
        hint: "DCHAT.Settings.cleanerChat.Hint"
    },
    [SETTING_KEYS.COLLAPSIBLE_FORMULA]: {
        name: "DCHAT.Settings.CollapsibleFormula.Name",
        hint: "DCHAT.Settings.CollapsibleFormula.Hint"
    },
    [SETTING_KEYS.COMPACT_CHAT]: {
        name: "DCHAT.Settings.compactChat.Name",
        hint: "DCHAT.Settings.compactChat.Hint"
    },
    [SETTING_KEYS.AUTOCOMPLETE_WHISPER]: {
        name: "DCHAT.Settings.autocompleteWhisper.Name",
        hint: "DCHAT.Settings.autocompleteWhisper.Hint"
    },
    [SETTING_KEYS.HIDE_CHAT_INITIATIVE]: {
        name: "DCHAT.Settings.hideChatInitiative.Name",
        hint: "DCHAT.Settings.hideChatInitiative.Hint",
        scope: "world"
    },
    [SETTING_KEYS.HIDE_PRIVATE_MESSAGES]: {
        name: "DCHAT.Settings.HidePrivateMessages.Name",
        hint: "DCHAT.Settings.HidePrivateMessages.Hint",
        scope: "world",
        restricted: true
    },
    [SETTING_KEYS.HIDE_DAMAGE_TRAITS]: {
        name: "DCHAT.Settings.hideDamageTraits.Name",
        hint: "DCHAT.Settings.hideDamageTraits.Hint"
    },
    [SETTING_KEYS.TRAIT_FILTER]: {
        name: "DCHAT.Settings.traitFilter.Name",
        hint: "DCHAT.Settings.traitFilter.Hint"
    },
    [SETTING_KEYS.HIDE_DAMAGE_BUTTONS]: {
        name: "DCHAT.Settings.HideDamageButtons.Name",
        hint: "DCHAT.Settings.HideDamageButtons.Hint"
    }
};

export const FEATURE_CLASSES = {
    CLEANER_CHAT: "dchat-cleaner-chat",
    HIDE_DAMAGE_TRAITS: "dchat-hide-damage-traits",
    TRAIT_FILTER: "dchat-trait-filter",
    COLLAPSIBLE_FORMULA: "dchat-collapsible-formula",
    COMPACT_CHAT: "dchat-compact-chat"
};

export const CHAT_TAB_CONFIG = [
    { id: MESSAGE_TYPES.CHAT, label: "DCHAT.Tabs.Chat", icon: "fa-comments" },
    { id: MESSAGE_TYPES.GAME, label: "DCHAT.Tabs.Game", icon: "fa-dice-d20" },
    { id: MESSAGE_TYPES.WHISPER, label: "DCHAT.Tabs.Whispers", icon: "fa-lock" },
];

export const CHAT_SELECTORS = {
    SECTION: "#chat, [data-tab='chat']",
    CONTROLS: "#chat-controls",
    FORM: "#chat-form, form.chat-form",
    FOUNDRY_CLEAR_BUTTON: 'button[data-action="flush"]',
    FOUNDRY_CLEAR_ICON: ".fa-trash, .fa-trash-can",
    MESSAGE_LIST: "#chat-log, .chat-log, ol.chat-messages, [class*='chat-log']",
    TAB_BAR: ".dchat-tab-bar",
    TAB_BUTTON: ".dchat-tab-bar .dchat-tab",
    TAB_DATA: "[data-dchat-tab]",
    MESSAGE_ID: "[data-message-id]",
    SCOPED_CLEAR: ".dchat-scoped-clear",
    PIP: ".dchat-pip"
};

export const CHAT_CLASSES = {
    MODULE_TOOLBAR: "dchat-module-toolbar",
    TAB_BAR: "dchat-tab-bar split-button",
    TAB_BUTTON: "dchat-tab",
    ACTIVE: "active",
    PIP: "dchat-pip",
    SCOPED_CLEAR: "ui-control icon fas fa-trash dchat-scoped-clear",
    FILTER_PREFIX: "dchat-filter"
};

export const CHAT_DATA = {
    TAB: "dchatTab",
    TYPE: "dchat-type",
    ACTION: "action",
    SETTING_ID: "settingId",
    SCOPED_CLEAR_ACTION: "scopedClear"
};

export const CHAT_SELECTOR_FACTORIES = {
    TAB_BUTTON_BY_ID: (tabId) => `.${CHAT_CLASSES.TAB_BUTTON}[data-dchat-tab="${tabId}"]`
};

export const CHAT_I18N = {
    TABS_ALL: "DCHAT.Tabs.All",
    TABS_CHAT: "DCHAT.Tabs.Chat",
    CLEAR_TOOLTIP: "DCHAT.Clear.Tooltip",
    CLEAR_NO_MESSAGES: "DCHAT.Clear.NoMessages",
    CLEAR_SUCCESS: "DCHAT.Clear.Success",
    CLEAR_TITLE: "DCHAT.Clear.Title",
    CLEAR_CONFIRM: "DCHAT.Clear.Confirm"
};

export const CHAT_BATCH_SIZE = 100;

export const SETTINGS_CLASSES = {
    ROW: "dchat-settings-row",
    GROUP: "dchat-settings-group",
    GROUP_TITLE: "dchat-settings-group-title"
};

export const SETTINGS_SELECTORS = {
    FORM_GROUP: ".form-group"
};

export const SETTINGS_SELECTOR_FACTORIES = {
    ROW: (settingId) => `[data-setting-id="${settingId}"]`,
    INPUT: (settingId) => `[id$="${settingId}"]`
};

export const SETTINGS_I18N = {
    GROUP_PREFIX: "DCHAT.Settings.Groups"
};

export const CLEANER_CHAT_SELECTORS = {
    AVATARS: "header img, .message-header img, .message-portrait, [class*='portrait']",
    USERS: "header span.user, .message-header span.user",
    ROLL_TITLE: ".dice-roll h4",
    ROLL: ".dice-roll",
    FORMULA: ".dice-formula"
};

export const CLEANER_CHAT_CLASSES = {
    SHOW_FORMULA: "dchat-show"
};

export const AUTOCOMPLETE_WHISPER = {
    HOST_SELECTOR: "#chat-notifications, #chat-form, form.chat-form",
    EDITOR_SELECTOR: "prose-mirror[name='message'], prose-mirror, .editor-content[contenteditable='true'], [contenteditable='true']",
    MAX_RESULTS: 6,
    PREFIX_PATTERN: /^(\/w|\/whisper)\s+/i,
    HOST_CLASS: "dchat-whisper-autocomplete-host",
    POPUP_CLASS: "dchat-whisper-autocomplete",
    VISIBLE_CLASS: "visible",
    POPUP_ID_PREFIX: "dchat-whisper",
    OPTION_CLASS: "dchat-whisper-option",
    ACTIVE_OPTION_CLASS: "active",
    STATUS_CLASS: "dchat-whisper-status",
    ACTIVE_STATUS_CLASS: "is-active",
    NAME_CLASS: "dchat-whisper-name",
    INDEX_DATA: "dchatWhisperIndex",
    INDEX_SELECTOR: "[data-dchat-whisper-index]",
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
    CLICKABLE_TRAIT_TAG: "span.tag.dchat-clickable",
    DAMAGE_BUTTONS: "button.success[data-action='strike-damage'], button.critical-success[data-action='strike-damage']",
    MESSAGE_METADATA: ".message-metadata",
    MESSAGE_DELETE: ".message-delete",
    TOGGLE_DAMAGE_BUTTONS: ".dchat-toggle-buttons"
};

export const PF2E_CLASSES = {
    FILTERED_TRAIT: "dchat-filtered",
    CLICKABLE_TRAIT: "dchat-clickable",
    HIDDEN_TRAIT: "dchat-hidden",
    EXPANDED_TRAITS: "dchat-expanded",
    HIDDEN_DAMAGE_BUTTONS: "dchat-buttons-hidden",
    TOGGLE_DAMAGE_BUTTONS: "dchat-toggle-buttons"
};

export const PF2E_DATA = {
    TRAITS_LIMITED: "dchatLimited",
    DAMAGE_BUTTONS_PROCESSED: "dchatButtonsProcessed"
};

export const PF2E_LIMITS = {
    VISIBLE_TRAITS: 3
};

export const PF2E_I18N = {
    SHOW_DAMAGE_BUTTONS: "DCHAT.HideDamageButtons.Show",
    HIDE_DAMAGE_BUTTONS: "DCHAT.HideDamageButtons.Hide",
    TOGGLE_DAMAGE_BUTTONS: "DCHAT.HideDamageButtons.ToggleLabel"
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

export const PRIVATE_MESSAGE_DATA = {
    HIDDEN: "dchatPrivateHidden"
};
