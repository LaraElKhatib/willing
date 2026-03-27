import { useMemo, useState } from 'react';

import CalendarInfo from '../components/CalendarInfo';
import Card from '../components/Card';
import LinkButton from '../components/LinkButton';

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function CalendarInfoDemoPage() {
  const today = useMemo(() => new Date(), []);

  const disabledDates = useMemo(() => {
    return [toDateValue(addDays(today, 1)), toDateValue(addDays(today, 4))];
  }, [today]);

  const dateDetails = useMemo(() => {
    return {
      [toDateValue(today)]: 'Open',
      [toDateValue(addDays(today, 2))]: 'Hot',
      [toDateValue(addDays(today, 6))]: 'Peak',
    };
  }, [today]);

  const crossMonthInitialRange = useMemo(() => {
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    return {
      from: toDateValue(addDays(endOfCurrentMonth, -2)),
      to: toDateValue(addDays(startOfNextMonth, 2)),
    };
  }, [today]);

  const [rangeWithDetailsValue, setRangeWithDetailsValue] = useState({ from: '', to: '' });
  const [rangeValue, setRangeValue] = useState({ from: '', to: '' });
  const [crossMonthRangeValue, setCrossMonthRangeValue] = useState(crossMonthInitialRange);
  const [selectedDates, setSelectedDates] = useState<string[]>([
    toDateValue(today),
    toDateValue(addDays(today, 2)),
  ]);

  return (
    <main className="min-h-screen bg-base-200 p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card
          title="CalendarInfo Demo"
          description="Live examples for range and separate-date selection with disabled dates and date-level detail text."
        >
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton to="/" color="secondary" size="sm">Back to Home</LinkButton>
            <span className="badge badge-outline">
              Disabled:
              {' '}
              {disabledDates.join(', ')}
            </span>
          </div>
        </Card>

        <Card title="1) Range Mode (With Disabled Dates + Details)">
          <div className="flex flex-col gap-4">
            <CalendarInfo
              selectionMode="range"
              rangeLabel="Start -> End"
              rangeValue={rangeWithDetailsValue}
              onRangeChange={setRangeWithDetailsValue}
              disabledDates={disabledDates}
              dateDetails={dateDetails}
            />
            <p className="text-sm opacity-75">
              From:
              {' '}
              {rangeWithDetailsValue.from || 'Not selected'}
              {' '}
              | To:
              {' '}
              {rangeWithDetailsValue.to || 'Not selected'}
            </p>
          </div>
        </Card>

        <Card title="2) Range Mode">
          <div className="flex flex-col gap-4">
            <CalendarInfo
              selectionMode="range"
              rangeLabel="Posting date range"
              rangeValue={rangeValue}
              onRangeChange={setRangeValue}
              disabledDates={disabledDates}
              dateDetails={dateDetails}
            />
            <p className="text-sm opacity-75">
              From:
              {' '}
              {rangeValue.from || 'Not selected'}
              {' '}
              | To:
              {' '}
              {rangeValue.to || 'Not selected'}
            </p>
          </div>
        </Card>

        <Card title="3) Separate Dates Mode">
          <div className="flex flex-col gap-4">
            <CalendarInfo
              selectionMode="multiple"
              multipleLabel="Volunteer attendance days"
              selectedDates={selectedDates}
              onSelectedDatesChange={setSelectedDates}
              disabledDates={disabledDates}
              dateDetails={dateDetails}
            />
            <p className="text-sm opacity-75">
              Selected dates:
              {' '}
              {selectedDates.length ? selectedDates.join(', ') : 'None'}
            </p>
          </div>
        </Card>

        <Card title="4) Range Across Months">
          <div className="flex flex-col gap-4">
            <p className="text-sm opacity-75">
              This range starts near the end of one month and ends in the next month.
              {' '}
              You can also click a start date, navigate months, and pick an end date there.
            </p>
            <CalendarInfo
              selectionMode="range"
              rangeLabel="Cross-month range"
              rangeValue={crossMonthRangeValue}
              onRangeChange={setCrossMonthRangeValue}
            />
            <p className="text-sm opacity-75">
              From:
              {' '}
              {crossMonthRangeValue.from || 'Not selected'}
              {' '}
              | To:
              {' '}
              {crossMonthRangeValue.to || 'Not selected'}
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
