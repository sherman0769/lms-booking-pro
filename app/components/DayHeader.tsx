import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Props {
  date: Date;
}

export default function DayHeader({ date }: Props) {
  const text = format(date, 'M/d（EEE）', { locale: zhTW });
  return (
    <th
      className="sticky top-0 z-10 h-11 w-24 whitespace-nowrap bg-emerald-950 px-1 text-center text-xs font-semibold text-white ring-1 ring-emerald-900/70 sm:h-10 sm:w-28 sm:text-sm"
    >
      {text}
    </th>
  );
}
