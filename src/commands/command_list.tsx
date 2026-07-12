import EquationCitator from '@/main';
import { autoNumberCurrentFileEquations, autoNumberCurrentFileFigures, insertAutoNumberTag } from '@/func/autoNumber';
import { MarkdownView, Notice, Platform } from 'obsidian';
import { exportCurrentMarkdown } from '@/func/exportMarkdown';
import { insertTextWithCursorOffset } from '@/utils/workspace/insertTextOnCursor';
import { createCitationString, createEquationTagString } from '@/utils/string_processing/regexp_utils';
import { invokeView } from '@/utils/workspace/invokePanelView';
import { EQUATION_MANAGE_PANEL_TYPE } from '@/ui/panels/equationManagePanel/mainPanel';
import { boxSelectedEquation } from '@/func/equations_helper';
import { syncCurrentFileToWebsiteNotesFolder, syncRepositoryToWebsiteNotesFolder } from '@/func/syncWebsiteNotes';
import { t } from '@/i18n/getLocale';

export default function registerCommands(plugin: EquationCitator) {
    plugin.addCommand({
        id: 'auto-number-current-file-equations',
        name: t("commands.autoNumberCurrentFileEquations"),
        callback: async() => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            await autoNumberCurrentFileEquations(plugin);
        }
    });

    plugin.addCommand({
        id: 'auto-number-current-file-figures',
        name: t("commands.autoNumberCurrentFileFigures"),
        callback: async() => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            await autoNumberCurrentFileFigures(plugin);
        }
    });

    plugin.addCommand({
        id: 'insert-citation-on-cursor-position',
        name: t("commands.insertCitationOnCursorPosition"),
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const citeString = createCitationString("");
            // Move cursor inside the braces
            insertTextWithCursorOffset(editor, citeString, 6);
        }
    })

    plugin.addCommand({
        id: 'insert-equation-citation-on-cursor-position',
        name: t("commands.insertEquationCitationOnCursorPosition"),
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const citePrefix = plugin.settings.citationPrefix;
            const citationString = createCitationString(citePrefix);
            // Move cursor to the correct position 
            insertTextWithCursorOffset(editor, citationString, 6 + citePrefix.length);
        },
    })

    plugin.addCommand({
        id: 'insert-figure-citation-on-cursor-position',
        name: t("commands.insertFigureCitationOnCursorPosition"),
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const citePrefix = plugin.settings.figCitationPrefix;
            const citationString = createCitationString(citePrefix);
            // Move cursor to the correct position
            insertTextWithCursorOffset(editor, citationString, 6 + citePrefix.length);
        },
    })

    plugin.addCommand({
        id: 'make-markdown-copy-to-export-PDF',
        name: t("commands.makeMarkdownCopyToExportPdf"),
        callback: async () => {
            await exportCurrentMarkdown(plugin);
        }
    })

    if (Platform.isDesktopApp) {
        plugin.addCommand({
            id: 'sync-repository-to-website-notes-folder',
            name: t("commands.syncRepositoryToWebsiteNotesFolder"),
            callback: async () => {
                await syncRepositoryToWebsiteNotesFolder(plugin);
            }
        })

        plugin.addCommand({
            id: 'sync-current-file-to-website-notes-folder',
            name: t("commands.syncCurrentFileToWebsiteNotesFolder"),
            callback: async () => {
                await syncCurrentFileToWebsiteNotesFolder(plugin);
            }
        })
    }

    plugin.addCommand({
        id: 'insert-tag-on-cursor-position',
        name: t("commands.insertTagOnCursorPosition"),
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const tagString = createEquationTagString("", plugin.settings.enableTypstMode);
            // Move cursor inside the braces
            insertTextWithCursorOffset(editor, tagString, plugin.settings.enableTypstMode ? 8 : 5);
        }
    })

    plugin.addCommand({
        id: 'insert-tag-with-auto-number-on-cursor-position',
        name: t("commands.insertTagWithAutoNumberOnCursorPosition"),
        callback: () => {
            insertAutoNumberTag(plugin);
        }
    })

    plugin.addCommand({
        id: 'box-current-equation',
        name: t("commands.boxCurrentEquation"),
        callback: () => {
            boxSelectedEquation(plugin);
        }
    })
    
    plugin.addCommand({
        id: 'clear-cache',
        name: t("commands.clearCache"), 
        callback: () => {
            plugin.clearCaches();
            new Notice(t("settings.clearCache.notice")); 
        }
    })

    plugin.addCommand({
        id: 'open-equation-manage-panel',
        name: t("commands.openEquationManagePanel"),
        callback: async () => {
            await invokeView(plugin, EQUATION_MANAGE_PANEL_TYPE);
        }
    })
}
