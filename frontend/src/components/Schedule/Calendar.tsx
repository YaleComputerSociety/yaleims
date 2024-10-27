import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";


import { Match } from "../../data/matches";

interface CalendarViewProps {
  events: {
    title: string;
    start: Date;
    end: Date;
    match: Match;
  }[];
  onMatchClick: (match: Match) => void;
}

const localizer = momentLocalizer(moment);

const CalendarView: React.FC<CalendarViewProps> = ({ events, onMatchClick }) => (
  <Calendar
    localizer={localizer}
    events={events}
    startAccessor="start"
    endAccessor="end"
    style={{ height: 500 }}
    onSelectEvent={(event) => onMatchClick(event.match)}
  />
);

export default CalendarView;
