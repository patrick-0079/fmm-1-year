import { icon } from "./icons";

export class Modal {
  element: HTMLDialogElement;
  body: HTMLElement;
  private cleanups: (() => void)[] = [];
  private previousFocus: HTMLElement | null = null;
  onChange: (open: boolean) => void = () => {};
  constructor() {
    this.element = document.createElement("dialog");
    this.element.className = "modal";
    this.element.innerHTML = `<section class="modal-card"><button class="icon-button modal-close" aria-label="关闭">${icon("close")}</button><div class="modal-heading"><span class="eyebrow" id="modal-label"></span><h2 id="modal-title"></h2><p id="modal-subtitle"></p></div><div class="modal-body"></div></section>`;
    this.element.setAttribute("aria-labelledby", "modal-title");
    document.body.append(this.element);
    this.body = this.element.querySelector(".modal-body")!;
    this.element
      .querySelector(".modal-close")!
      .addEventListener("click", () => this.close());
    this.element.addEventListener("click", (event) => {
      if (event.target === this.element) this.close();
    });
    this.element.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    this.element.addEventListener("close", () => {
      this.cleanup();
      this.onChange(false);
      this.previousFocus?.focus({ preventScroll: true });
    });
  }
  get isOpen() {
    return this.element.open;
  }
  open(title: string, subtitle: string, label = "NEMU’S LITTLE WORLD") {
    this.cleanup();
    this.element.querySelector("#modal-title")!.textContent = title;
    this.element.querySelector("#modal-subtitle")!.textContent = subtitle;
    this.element.querySelector("#modal-label")!.textContent = label;
    this.body.replaceChildren();
    if (!this.isOpen) {
      this.previousFocus = document.activeElement as HTMLElement;
      this.element.showModal();
    }
    this.element.scrollTop = 0;
    this.onChange(true);
    return this.body;
  }
  onCleanup(callback: () => void) {
    this.cleanups.push(callback);
  }
  close() {
    if (this.isOpen) {
      this.cleanup();
      this.element.close();
    }
  }
  private cleanup() {
    for (const fn of this.cleanups.splice(0)) fn();
  }
}
