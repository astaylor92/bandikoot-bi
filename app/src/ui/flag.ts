import { Flags } from '../api/redmist/flags';

export interface FlagStyle {
  label: string;
  className: string;
}

export function flagStyle(flag: Flags): FlagStyle {
  switch (flag) {
    case Flags.Green:
      return { label: 'GREEN', className: 'bg-flag-green text-white' };
    case Flags.Yellow:
      return { label: 'YELLOW', className: 'bg-flag-yellow text-black' };
    case Flags.Red:
      return { label: 'RED', className: 'bg-flag-red text-white' };
    case Flags.White:
      return { label: 'WHITE', className: 'bg-flag-white text-black' };
    case Flags.Checkered:
      return { label: 'CHECKERED', className: 'bg-white text-black' };
    case Flags.Black:
      return { label: 'BLACK', className: 'bg-black text-white border border-white' };
    case Flags.Purple35:
      return { label: 'PURPLE 35', className: 'bg-purple-600 text-white' };
    case Flags.Purple60:
      return { label: 'PURPLE 60', className: 'bg-purple-600 text-white' };
    default:
      return { label: '—', className: 'bg-pit-line text-pit-dim' };
  }
}
