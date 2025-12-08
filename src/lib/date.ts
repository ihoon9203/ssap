import { format as dateFnsFormat, FormatOptions } from "date-fns";
import { ko } from "date-fns/locale";

const defaultOptions: FormatOptions = {
    locale: ko,
};

export const formatDate = (
    date: Date | number,
    formatStr: string,
    options?: FormatOptions
): string => {
    return dateFnsFormat(date, formatStr, { ...defaultOptions, ...options });
};

export const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
    isBefore,
    startOfDay,
    compareAsc,
    addMinutes,
    isAfter,
    set,
    parse
} from "date-fns";
