/**
 * Runs before bot tests load modules that touch `Pix32` → `Jpeg` (top-level `document.createElement`).
 */
function stubCanvas(): HTMLCanvasElement {
    const ctx = {
        willReadFrequently: true,
        clearRect: (): void => {},
        drawImage: (): void => {},
        getImageData: (_x: number, _y: number, _w: number, _h: number): ImageData =>
            ({ data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData)
    };
    return {
        width: 1,
        height: 1,
        getContext: (_type: string, _opts?: { willReadFrequently?: boolean }): CanvasRenderingContext2D => ctx as unknown as CanvasRenderingContext2D
    } as unknown as HTMLCanvasElement;
}

if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        createElement: (tag: string): HTMLElement => {
            if (tag === 'canvas') {
                return stubCanvas() as unknown as HTMLElement;
            }
            if (tag === 'img') {
                return {
                    onload: null as (() => void) | null,
                    src: '',
                    naturalWidth: 1,
                    naturalHeight: 1
                } as unknown as HTMLElement;
            }
            return {} as HTMLElement;
        }
    } as unknown as Document;
}
