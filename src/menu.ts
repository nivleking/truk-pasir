import type { HighScore } from './core/highScores';
import { findLevel, isUnlocked, LEVELS, type Progress } from './core/levels';
import { findVehicle, VEHICLES } from './core/vehicles';

const el = <T extends HTMLElement>(id: string) => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} not found`);
  return e as T;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface Menu {
  show(): void;
  hide(): void;
  readonly visible: boolean;
}

export function createMenu(opts: {
  initialName: string;
  initialVehicle: string;
  initialHelper: boolean;
  initialLevel: string;
  getScores: () => HighScore[];
  getProgress: () => Progress;
  onPlay: (name: string, vehicleId: string, helper: boolean, levelId: string) => void;
}): Menu {
  const menu = el<HTMLDivElement>('menu');
  const main = el<HTMLDivElement>('menu-main');
  const scores = el<HTMLDivElement>('menu-scores');
  const name = el<HTMLInputElement>('player-name');
  const table = el<HTMLTableSectionElement>('score-rows');
  name.value = opts.initialName;

  const picker = el<HTMLDivElement>('vehicle-picker');
  let selected = findVehicle(opts.initialVehicle).id as string;
  const maxCapacity = Math.max(...VEHICLES.map((v) => v.capacity));
  picker.innerHTML = VEHICLES.map(
    (v) =>
      `<button type="button" class="vehicle" data-id="${v.id}">` +
      `<strong>${v.name}</strong><span>${v.description}</span>` +
      `<em>LOAD ${v.capacity}</em><div class="bar"><i style="width:${Math.round((v.capacity / maxCapacity) * 100)}%"></i></div></button>`,
  ).join('');
  const markSelected = () =>
    picker.querySelectorAll<HTMLButtonElement>('.vehicle').forEach((b) => b.classList.toggle('selected', b.dataset.id === selected));
  picker.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.vehicle');
    if (!b?.dataset.id) return;
    selected = b.dataset.id;
    markSelected();
  });
  markSelected();
  const helper = el<HTMLInputElement>('helper-loader');
  helper.checked = opts.initialHelper;
  const helperRow = el<HTMLLabelElement>('helper-row');
  const syncHelper = () => (helperRow.hidden = findVehicle(selected).kind !== 'dump');
  picker.addEventListener('click', syncHelper);
  syncHelper();

  const levelPicker = el<HTMLDivElement>('level-picker');
  let level = findLevel(opts.initialLevel).id;
  const stars = (n: number) => '★'.repeat(n) + `<span class="off">${'★'.repeat(3 - n)}</span>`;
  function renderLevels() {
    const progress = opts.getProgress();
    if (!LEVELS.some((l, i) => l.id === level && isUnlocked(i, progress))) level = LEVELS[0]!.id;
    levelPicker.innerHTML = LEVELS.map((l, i) => {
      const open = isUnlocked(i, progress);
      return (
        `<button type="button" class="vehicle${l.id === level ? ' selected' : ''}" data-id="${l.id}"${open ? '' : ' disabled'}>` +
        `<span class="num">${i + 1}</span><strong>${l.name.replace(/^\d+\.\s*/, '')}</strong>` +
        `<span>${open ? l.description : 'Earn 1 star on the previous site to unlock.'}</span>` +
        `<em>${open ? stars(progress[l.id] ?? 0) : 'LOCKED'}</em></button>`
      );
    }).join('');
  }
  levelPicker.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.vehicle');
    if (!b?.dataset.id || b.disabled) return;
    level = b.dataset.id;
    renderLevels();
  });

  const showPage = (page: 'main' | 'scores') => {
    main.hidden = page !== 'main';
    scores.hidden = page !== 'scores';
    if (page === 'scores') renderScores();
    else name.focus();
  };

  function renderScores() {
    const list = opts.getScores();
    table.innerHTML = list.length
      ? list
          .map(
            (s, i) =>
              `<tr><td>${i + 1}</td><td>${escapeHtml(s.name)}</td><td>${s.score}</td>` +
              `<td>${s.level ? findLevel(s.level).name : '-'}</td>` +
              `<td>${s.vehicle ? findVehicle(s.vehicle).name : '-'}</td>` +
              `<td>${s.percent}%</td><td>${s.seconds.toFixed(1)} s</td><td>${s.date}</td></tr>`,
          )
          .join('')
      : `<tr><td colspan="8" class="empty">The board is empty. Be the first driver on it.</td></tr>`;
  }

  const play = () => opts.onPlay(name.value, selected, helper.checked, level);
  el('btn-play').addEventListener('click', play);
  name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') play();
  });
  el('btn-scores').addEventListener('click', () => showPage('scores'));
  el('btn-back').addEventListener('click', () => showPage('main'));

  return {
    show() {
      menu.hidden = false;
      document.body.classList.add('in-menu');
      renderLevels();
      showPage('main');
    },
    hide() {
      menu.hidden = true;
      document.body.classList.remove('in-menu');
    },
    get visible() {
      return !menu.hidden;
    },
  };
}
