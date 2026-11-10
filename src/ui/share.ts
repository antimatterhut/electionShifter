// Copy-link control. The link always points at the live site.
import { shareUrl, type UrlState } from '../domain/urlState.ts';

export interface SharePanel {
  /** Update the shown link and the address bar (replaceState, no history entries). */
  set(s: UrlState): void;
}

export function mountShare(host: HTMLElement): SharePanel {
  host.innerHTML = `
    <button type="button" id="copy-link">Copy link</button>
    <input id="share-link" type="text" readonly aria-label="Shareable link">
    <span id="copy-status" role="status"></span>`;
  const input = host.querySelector<HTMLInputElement>('#share-link')!;
  const status = host.querySelector<HTMLElement>('#copy-status')!;
  host.querySelector('#copy-link')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      status.textContent = 'Link copied.';
    } catch {
      input.select();
      status.textContent = 'Copy failed; the link is selected, press Ctrl+C.';
    }
  });
  return {
    set(s) {
      const url = shareUrl(s);
      input.value = url;
      const query = url.slice(url.indexOf('?'));
      try {
        history.replaceState(null, '', query);
      } catch {
        /* replaceState can be blocked in odd contexts; the link box still works */
      }
    },
  };
}
