export function addPrefix(this: HTMLInputElement, _ev: Event) {
    this.setAttribute('size', `${this.value!.length}`);
}
