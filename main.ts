import { Plugin } from "obsidian";
import {
  TaskCaptureSettings,
  TaskCaptureSettingTab,
  DEFAULT_SETTINGS,
} from "./src/settings";
import { CaptureModal } from "./src/CaptureModal";

export default class TaskCapturePlugin extends Plugin {
  settings: TaskCaptureSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("list-checks", "Capture task", () => {
      new CaptureModal(this.app, this).open();
    });

    this.addCommand({
      id: "capture",
      name: "Capture task",
      callback: () => new CaptureModal(this.app, this).open(),
    });

    this.addSettingTab(new TaskCaptureSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
