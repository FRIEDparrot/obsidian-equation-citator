import EquationCitator from "@/main";
import { Notice } from "obsidian";
const versionUrl = "https://raw.githubusercontent.com/FRIEDparrot/obsidian-equation-citator/refs/heads/master/manifest.json"

export async function isUpdateAvailable(plugin: EquationCitator, use_notice=true): Promise<boolean> {
    try {
        const response = await fetch(versionUrl);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            new Notice("Network error");
            return false;
        }
        const data = await response.json();
        const latestVersion = data.version;
        const currentVersion = plugin.manifest.version;

        const updateAvailable = latestVersion !== currentVersion;
        if (use_notice) {
            if (updateAvailable) {
                new Notice(`New version v${latestVersion} is available`);
            }
            else {
                new Notice("You are already using the latest version");
            }
        }
        return updateAvailable;
    }
    catch (error) {
        console.error("Error checking for updates:", error);
        new Notice("Error to check for updates, check console for details.");
        return false;
    }
}
