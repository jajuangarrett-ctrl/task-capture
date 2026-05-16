import { App, ButtonComponent, Modal, Notice, Setting } from "obsidian";
import { sendTaskToTaskboard } from "./taskboardApi";
import {
  cleanupTranscript,
  startRecording,
  transcribeWhisper,
  type VoiceRecorder,
} from "./transcribe";
import { BUCKETS } from "./types";
import type { Bucket } from "./types";
import type TaskCapturePlugin from "../main";

export class CaptureModal extends Modal {
  private plugin: TaskCapturePlugin;
  private bucket: Bucket = "Do First";
  private text = "";

  private textArea: HTMLTextAreaElement | null = null;
  private recordButton: ButtonComponent | null = null;
  private recorder: VoiceRecorder | null = null;
  private recording = false;
  private busy = false;

  constructor(app: App, plugin: TaskCapturePlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Capture task" });

    const last = this.plugin.settings.lastUsedBucket;
    this.bucket = (BUCKETS as readonly string[]).includes(last) ? last : "Do First";

    new Setting(contentEl).setName("Status").addDropdown((d) => {
      BUCKETS.forEach((b) => d.addOption(b, b));
      d.setValue(this.bucket);
      d.onChange((v) => {
        this.bucket = v as Bucket;
      });
    });

    new Setting(contentEl)
      .setName("Task")
      .setDesc("Tap Record to dictate, or type below. Cleanup runs automatically when both API keys are set.")
      .addTextArea((t) => {
        this.textArea = t.inputEl;
        t.inputEl.rows = 4;
        t.inputEl.style.width = "100%";
        t.onChange((v) => {
          this.text = v;
        });
      });

    new Setting(contentEl)
      .setName("Voice capture")
      .addButton((b) => {
        this.recordButton = b;
        b.setButtonText("Record").onClick(() => this.toggleRecord());
      });

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Save")
          .setCta()
          .onClick(() => this.save(false))
      )
      .addButton((b) =>
        b.setButtonText("Save & capture another").onClick(() => this.save(true))
      );

    setTimeout(() => this.textArea?.focus(), 0);
  }

  private async toggleRecord() {
    if (this.busy || !this.recordButton) return;

    if (!this.recording) {
      if (!this.plugin.settings.openaiApiKey) {
        new Notice("Add your OpenAI API key in plugin settings before recording.");
        return;
      }
      try {
        this.recorder = await startRecording();
        this.recording = true;
        this.recordButton.setButtonText("Stop");
        this.recordButton.setWarning();
      } catch (e) {
        new Notice(`Microphone error: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }

    this.recording = false;
    this.busy = true;
    this.recordButton.setDisabled(true);
    this.recordButton.removeCta();
    this.recordButton.setButtonText("Transcribing...");

    try {
      const audio = await this.recorder!.stop();
      let transcript = await transcribeWhisper(
        audio,
        this.plugin.settings.openaiApiKey
      );

      if (this.plugin.settings.anthropicApiKey && transcript) {
        this.recordButton.setButtonText("Cleaning up...");
        transcript = await cleanupTranscript(
          transcript,
          this.plugin.settings.anthropicApiKey,
          { acronyms: this.plugin.settings.customAcronyms }
        );
      }

      this.text = mergeTranscript(this.text, transcript);
      if (this.textArea) {
        this.textArea.value = this.text;
        this.textArea.focus();
      }
    } catch (e) {
      new Notice(`Voice capture failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.busy = false;
      this.recorder = null;
      if (this.recordButton) {
        this.recordButton.setDisabled(false);
        this.recordButton.setButtonText("Record");
      }
    }
  }

  private async save(forceAnother: boolean) {
    if (this.busy) {
      new Notice("Voice capture still running.");
      return;
    }
    const text = this.text.trim();
    if (!text) {
      new Notice("Add some text before saving.");
      return;
    }

    try {
      await sendTaskToTaskboard(this.plugin.settings, { text, bucket: this.bucket });
    } catch (e) {
      new Notice(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    this.plugin.settings.lastUsedBucket = this.bucket;
    await this.plugin.saveSettings();

    new Notice(`Saved as ${this.bucket}.`);

    const reopen = forceAnother || this.plugin.settings.showAnotherAfterSave;
    this.close();
    if (reopen) {
      setTimeout(() => new CaptureModal(this.app, this.plugin).open(), 200);
    }
  }

  onClose() {
    if (this.recorder) {
      this.recorder.cancel();
      this.recorder = null;
    }
    this.contentEl.empty();
  }
}

function mergeTranscript(existing: string, addition: string): string {
  const a = existing.trim();
  const b = addition.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} ${b}`;
}
