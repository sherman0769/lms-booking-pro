import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Props {
  date: Date;
}

export default function DayHeader({ date }: Props) {
  const text = format(date, 'M/d（EEE）', { locale: zhTW });
  return (
    <th
      className="sticky top-0 z-10 h-11 w-24 bg-white/90 px-1 text-center text-xs font-bold whitespace-nowrap ring-1 ring-gray-200 backdrop-blur sm:h-10 sm:w-28 sm:text-sm"
    >
      {text}
    </th>
  );
}
