import { find, findByProps } from "@vendetta/metro"
import { instead, after } from "@vendetta/patcher"
import { storage } from "@vendetta/plugin"

const appearanceSettingsModule = findByProps("setShouldSyncAppearanceSettings")
const canUseNitroThemesModule = find(m => m.default?.canUseClientThemes)
const themeUtilsModule = findByProps("updateBackgroundGradientPreset")

const { ClientThemesNewThemesExperiment } = findByProps("ClientThemesNewThemesExperiment") // old experiment
const { ClientThemesMobileExperiment } = findByProps("ClientThemesMobileExperiment") // new experiment

storage.isEnabled ??= false

// Go through our experiments and toggle any pre-req
// settings in order to do the patch.
if(ClientThemesNewThemesExperiment) ClientThemesNewThemesExperiment.getCurrentConfig().hasNewClientThemes = true;
if(ClientThemesMobileExperiment) ClientThemesMobileExperiment.getCurrentConfig().hasClientThemes = true;

appearanceSettingsModule.setShouldSyncAppearanceSettings(false)

// Set the previously set client theme
if(storage.theme && storage.isEnabled) themeUtilsModule.updateBackgroundGradientPreset(storage.theme)

// Unfreeze
canUseNitroThemesModule.default = { ...canUseNitroThemesModule.default }

// There is where the magic happens...
const patches = [
    // Set "Sync across clients" setting
    instead("setShouldSyncAppearanceSettings", appearanceSettingsModule, () => !storage.isEnabled),

    // Do we want the ability to use themes? Yes!
    instead("canUseClientThemes", canUseNitroThemesModule.default, () => true),

    // Update the theme index
    after("updateMobilePendingThemeIndex", themeUtilsModule, (args) => {
        storage.isEnabled = args[0] > 1 // 0 ~ 1 | default || 2 ~ | client themes
    }),

    // Lastly, set the theme
    after("updateBackgroundGradientPreset", themeUtilsModule, (args) => {
        storage.theme = args[0]
    })
]

export const onUnload = () => patches.forEach(p => p());
