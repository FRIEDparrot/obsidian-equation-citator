import EquationCitator from "@/main";
import { Notice, requestUrl } from "obsidian";
import t from "@/i18n/getLocale";
const versionUrl = "https://raw.githubusercontent.com/FRIEDparrot/obsidian-equation-citator/refs/heads/master/manifest.json"



/**
 * Check if a new version of the plugin is available by fetching the latest version from GitHub and comparing it with the current version.
 * 
 * This is never called now and just retained for possibly future use.
 */
export async function isUpdateAvailable(plugin: EquationCitator, use_notice=true): Promise<boolean> {
    try {
        const response = await requestUrl(versionUrl);
        if (response.status !== 200) {
            console.error(`HTTP error! status: ${response.status}`);
            new Notice(t("update.networkError"));
            return false;
        }
        const data = response.json;
        const latestVersion = data.version;
        const currentVersion = plugin.manifest.version;

        const updateAvailable = latestVersion !== currentVersion;
        if (use_notice) {
            if (updateAvailable) {
                new Notice(t("update.newVersionAvailable", { version: latestVersion }));
            }
            else {
                new Notice(t("update.latestVersion"));
            }
        }
        return updateAvailable;
    }
    catch (error) {
        console.error("Error checking for updates:", error);
        new Notice(t("update.checkFailed"));
        return false;
    }
}
