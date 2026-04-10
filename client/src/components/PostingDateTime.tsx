import { Calendar, Clock } from 'lucide-react';

type PostingDateTimeProps = {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  startDateLabel?: string;
  endDateLabel?: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  showEndDate?: boolean;
  className?: string;
};

function PostingDateTime({
  startDate,
  endDate,
  startTime,
  endTime,
  startDateLabel,
  endDateLabel,
  startTimeLabel,
  endTimeLabel,
  showEndDate,
  className,
}: PostingDateTimeProps) {
  const hasEndDate = Boolean(endDate);
  const isSameDate = hasEndDate && endDate === startDate;
  const hasEndTime = Boolean(endTime) && hasEndDate;
  const effectiveShowEndDate = showEndDate ?? (hasEndDate && !isSameDate);
  const effectiveStartDateLabel = startDateLabel ?? (effectiveShowEndDate ? 'START' : 'DATE');
  const effectiveEndDateLabel = endDateLabel ?? 'END';
  const effectiveStartTimeLabel = startTimeLabel ?? (hasEndTime ? 'START' : 'TIME');
  const effectiveEndTimeLabel = endTimeLabel ?? 'END';

  return (
    <div className={className}>
      <div className="flex items-center gap-3 grow h-22">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 mt-1">
            <Calendar size={16} className="text-primary" />
            {effectiveShowEndDate && <div className="w-0.5 h-6 bg-primary my-1" />}
            {effectiveShowEndDate && <Calendar size={16} className="text-primary" />}
          </div>
          <div>
            <div className="text-sm">
              <p className="text-xs opacity-70">{effectiveStartDateLabel}</p>
              <p className="font-medium">{startDate || 'TBA'}</p>
            </div>
            {effectiveShowEndDate && (
              <div className="mt-3 text-sm">
                <p className="text-xs opacity-70">{effectiveEndDateLabel}</p>
                <p className="font-medium">{endDate || 'TBA'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grow" />

        <div className="flex items-start gap-3">
          <div className="text-right">
            <div className="text-sm">
              <p className="text-xs opacity-70">{effectiveStartTimeLabel}</p>
              <p className="font-medium">{startTime || '—'}</p>
            </div>
            {hasEndDate && (
              <div className="mt-3 text-sm">
                <p className="text-xs opacity-70">{effectiveEndTimeLabel}</p>
                <p className="font-medium">{endTime || '—'}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center shrink-0 mt-1">
            <Clock size={16} className="text-primary" />
            {hasEndDate && <div className="w-0.5 h-6 bg-primary my-1" />}
            {hasEndDate && <Clock size={16} className="text-primary" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostingDateTime;
