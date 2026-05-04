import { App, PluginSettingTab, Setting } from "obsidian";
import type TaskCapturePlugin from "../main";
import type { Bucket } from "./types";

export interface TaskCaptureSettings {
  openaiApiKey: string;
  anthropicApiKey: string;
  tasksFilePath: string;
  showAnotherAfterSave: boolean;
  lastUsedBucket: Bucket;
  customAcronyms: string;
}

export const DEFAULT_SETTINGS: TaskCaptureSettings = {
  openaiApiKey: "",
  anthropicApiKey: "",
  tasksFilePath: "08 Tasks/Tasks.md",
  showAnotherAfterSave: true,
  lastUsedBucket: "Do First",
  customAcronyms: "CalWORKs, VPSS, FJG",
};

export class TaskCaptureSettingTab extends PluginSettingTab {
  plugin: TaskCapturePlugin;

  constructor(app: App, plugin: TaskCapturePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Task Capture" });

    new Setting(containerEl)
      .setName("Tasks file path")
      .setDesc("Single master file for all captured tasks (relative to vault root).")
      .addText((t) =>
        t
          .setPlaceholder("08 Tasks/Tasks.md")
          .setValue(this.plugin.settings.tasksFilePath)
          .onChange(async (v) => {
            this.plugin.settings.tasksFilePath = v.trim() || DEFAULT_SETTINGS.tasksFilePath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show another after save")
      .setDesc("After saving a task, immediately reopen the capture modal.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showAnotherAfterSave).onChange(async (v) => {
          this.plugin.settings.showAnotherAfterSave = v;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h3", { text: "Voice transcription" });

    new Setting(containerEl)
      .setName("OpenAI API key")
      .setDesc("Used by Whisper to transcribe voice captures. Stored locally in plugin data.")
      .addText((t) => {
        t.inputEl.type = "password";
        t
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (v) => {
            this.plugin.settings.openaiApiKey = v.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Anthropic API key")
      .setDesc("Used by Claude Haiku to clean up transcripts (fix grammar, preserve names). Optional.")
      .addText((t) => {
        t.inputEl.type = "password";
        t
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.anthropicApiKey)
          .onChange(async (v) => {
            this.plugin.settings.anthropicApiKey = v.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Custom acronyms")
      .setDesc("Comma-separated acronyms and proper nouns the cleanup pass should preserve verbatim.")
      .addText((t) =>
        t
          .setPlaceholder("CalWORKs, VPSS, FJG")
          .setValue(this.plugin.settings.customAcronyms)
          .onChange(async (v) => {
            this.plugin.settings.customAcronyms = v;
            await this.plugin.saveSettings();
          })
      );
  }
}
