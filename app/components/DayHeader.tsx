import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Props {
  date: Date;
}

export default function DayHeader({ date }: Props) {
  const text = format(date, 'M/d（EEE）', { locale: zhTW });
  return (
    <th
      className="sticky top-0 z-10 h-10 w-20 sm:w-28 bg-white/90 backdrop-blur text-center text-xs sm:text-sm font-bold ring-1 ring-gray-200"
    >
      {text}
    </th>
  );
}
