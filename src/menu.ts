import type { HighScore } from './core/highScores';
import { findLevel, LEVELS, type Progress } from './core/levels';
import { buyUpgrade, buyVehicle, MAX_UPGRADE, owns, upgradeCost, UPGRADES, VEHICLE_PRICES, type Career } from './core/career';
import { findVehicle, VEHICLES, type VehicleId } from './core/vehicles';

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
  getCareer: () => Career;
  setCareer: (c: Career) => void;
  getMode: () => 'career' | 'free';
  setMode: (m: 'career' | 'free') => void;
  getTime: () => 'day' | 'evening';
  setTime: (t: 'day' | 'evening') => void;
  /** Whether level i can be picked (career: earned by stars; free play: always). */
  levelOpen: (i: number) => boolean;
  onPlay: (name: string, vehicleId: string, helper: boolean, levelId: string) => void;
}): Menu {
  const menu = el<HTMLDivElement>('menu');
  const main = el<HTMLDivElement>('menu-main');
  const scores = el<HTMLDivElement>('menu-scores');
  const garage = el<HTMLDivElement>('menu-garage');
  const money = (n: number) => '$' + n.toLocaleString('en-US');
  const name = el<HTMLInputElement>('player-name');
  const table = el<HTMLTableSectionElement>('score-rows');
  name.value = opts.initialName;

  const picker = el<HTMLDivElement>('vehicle-picker');
  let selected = findVehicle(opts.initialVehicle).id as string;
  const maxCapacity = Math.max(...VEHICLES.map((v) => v.capacity));
  function renderVehicles() {
    const c = opts.getCareer();
    if (!owns(c, selected as VehicleId)) selected = 'dump-truck';
    picker.innerHTML = VEHICLES.map((v) => {
      const have = owns(c, v.id);
      const price = VEHICLE_PRICES[v.id];
      const foot = have
        ? `<em>LOAD ${v.capacity}</em><div class="bar"><i style="width:${Math.round((v.capacity / maxCapacity) * 100)}%"></i></div>`
        : `<em class="price${c.money >= price ? ' afford' : ''}">${c.money >= price ? 'BUY ' : 'LOCKED · '}${money(price)}</em>`;
      return (
        `<button type="button" class="vehicle${have ? '' : ' for-sale'}${v.id === selected ? ' selected' : ''}" data-id="${v.id}">` +
        `<strong>${v.name}</strong><span>${v.description}</span>${foot}</button>`
      );
    }).join('');
    wallet.forEach((w) => (w.textContent = money(c.money)));
    syncHelper();
  }
  picker.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.vehicle');
    const id = b?.dataset.id as VehicleId | undefined;
    if (!id) return;
    const c = opts.getCareer();
    if (!owns(c, id)) {
      const bought = buyVehicle(c, id);
      if (!bought) return;
      opts.setCareer(bought);
    }
    selected = id;
    renderVehicles();
  });
  const wallet = [el('wallet'), el('wallet-garage')];

  const modeSwitch = el<HTMLDivElement>('mode-switch');
  function renderMode() {
    const m = opts.getMode();
    modeSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    el('wallet-row').hidden = m !== 'career';
    el('btn-garage').hidden = m !== 'career';
    el('mode-hint').textContent =
      m === 'career'
        ? 'Earn money each round, buy vehicles and upgrades, unlock sites with stars.'
        : 'Every site and vehicle open, stock trucks, no money. Just drive.';
  }
  modeSwitch.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]');
    if (!b) return;
    opts.setMode(b.dataset.mode as 'career' | 'free');
    renderMode();
    renderLevels();
    renderVehicles();
  });

  const timeSwitch = el<HTMLDivElement>('time-switch');
  const renderTime = () =>
    timeSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('on', b.dataset.time === opts.getTime()));
  timeSwitch.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-time]');
    if (!b) return;
    opts.setTime(b.dataset.time as 'day' | 'evening');
    renderTime();
  });
  renderTime();

  const upgradeList = el<HTMLDivElement>('upgrade-list');
  function renderGarage() {
    const c = opts.getCareer();
    upgradeList.innerHTML = UPGRADES.map((u) => {
      const level = c.upgrades[u.id];
      const maxed = level >= MAX_UPGRADE;
      const cost = upgradeCost(u.id, level);
      const pips = Array.from({ length: MAX_UPGRADE }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
      return (
        `<div class="upgrade"><div><strong>${u.name}</strong><span>${u.effect} per level</span></div>` +
        `<div class="pips">${pips}</div>` +
        `<button type="button" data-id="${u.id}"${maxed || c.money < cost ? ' disabled' : ''}>${maxed ? 'MAX' : money(cost)}</button></div>`
      );
    }).join('');
    wallet.forEach((w) => (w.textContent = money(c.money)));
  }
  upgradeList.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
    if (!b || b.disabled) return;
    const next = buyUpgrade(opts.getCareer(), b.dataset.id as (typeof UPGRADES)[number]['id']);
    if (next) opts.setCareer(next);
    renderGarage();
  });
  const helper = el<HTMLInputElement>('helper-loader');
  helper.checked = opts.initialHelper;
  const helperRow = el<HTMLLabelElement>('helper-row');
  const syncHelper = () => {
    const c = opts.getCareer();
    helperRow.hidden = findVehicle(selected).kind !== 'dump' || !owns(c, 'wheel-loader');
  };

  const levelPicker = el<HTMLDivElement>('level-picker');
  let level = findLevel(opts.initialLevel).id;
  const stars = (n: number) => '★'.repeat(n) + `<span class="off">${'★'.repeat(3 - n)}</span>`;
  function renderLevels() {
    const progress = opts.getProgress();
    if (!LEVELS.some((l, i) => l.id === level && opts.levelOpen(i))) level = LEVELS[0]!.id;
    levelPicker.innerHTML = LEVELS.map((l, i) => {
      const open = opts.levelOpen(i);
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

  const showPage = (page: 'main' | 'scores' | 'garage') => {
    main.hidden = page !== 'main';
    scores.hidden = page !== 'scores';
    garage.hidden = page !== 'garage';
    if (page === 'scores') renderScores();
    else if (page === 'garage') renderGarage();
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
  el('btn-garage').addEventListener('click', () => showPage('garage'));
  el('btn-garage-back').addEventListener('click', () => showPage('main'));

  return {
    show() {
      menu.hidden = false;
      document.body.classList.add('in-menu');
      renderMode();
      renderLevels();
      renderVehicles();
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
