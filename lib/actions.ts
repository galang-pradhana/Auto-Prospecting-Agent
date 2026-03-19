/**
 * ACTIONS BRIDGE
 * 
 * Explicit named exports to prevent double-initialization of Prisma client.
 */

export { 
    getLeads, 
    deleteLeads, 
    getLeadsCount, 
    getLeadStats, 
    cleanupOldLeads, 
    getUniqueCategories, 
    archiveToGSheet, 
    saveForgeCode, 
    getProvinces, 
    getCities, 
    getDistricts,
    updateLeadEnrichmentData
} from './actions/lead';

export { 
    runScraper, 
    checkScraperHealth, 
    repairScraperPermissions 
} from './actions/scraper';

export { enrichLead, batchEnrichLeads, generateForgeCode, getKieCredit } from './actions/ai';

export { 
    getUserSettings, 
    updateUserSettings, 
    getWaTemplates, 
    saveWaTemplate, 
    deleteWaTemplate, 
    setDefaultWaTemplate, 
    generateWaTemplateDraft, 
    generateWaLink 
} from './actions/settings';

export { 
    getEffectivePrompt, 
    updateSystemPrompt, 
    resetSystemPrompt, 
    getCurrentPromptStates 
} from './actions/prompt';
