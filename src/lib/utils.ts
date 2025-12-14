import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
export function generateRandomCode(): string {
    // 사용 가능한 문자 집합: 대문자(A-Z), 소문자(a-z), 숫자(0-9)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeLength = 8;
    let result = '';

    // 8번 반복하여 각 자리에 랜덤 문자를 선택합니다.
    for (let i = 0; i < codeLength; i++) {
        // characters 문자열의 길이 내에서 랜덤 인덱스를 선택
        const randomIndex = Math.floor(Math.random() * characters.length);
        // 해당 인덱스의 문자를 결과 문자열에 추가
        result += characters.charAt(randomIndex);
    }

    return result;
}

// YYYYMMDD-XX 를 YYYYMMDD HH:MM 으로 변환
/**
 * 'YYYYMMDD-XX' 형식의 슬롯 코드를 읽어서 날짜와 해당 슬롯의 시작 시간(HH:MM)을 결합한
 * 'YYYYMMDD HH:MM' 형식의 문자열로 변환합니다.
 * (여기서 XX는 하루를 30분으로 나눈 슬롯 번호 0~47입니다.)
 * * @param slotCode 'YYYYMMDD-XX' 형식의 슬롯 코드 (예: '20251214-05')
 * @returns 'YYYYMMDD HH:MM' 형식의 날짜 및 시간 문자열 (예: '20251214 02:30')
 */
export function slotToTime(slotCode: string): string {
    // 1. 하이픈(-)을 기준으로 날짜와 슬롯 번호를 분리합니다.
    const parts = slotCode.split('-');

    // 코드가 'YYYYMMDD-XX' 형식이 아닐 경우 오류 처리 (선택 사항)
    if (parts.length !== 2) {
        // 실제 운영 환경에서는 더 구체적인 오류 처리가 필요합니다.
        console.error("Invalid slot code format:", slotCode);
        return slotCode;
    }

    const date = formatToKoreanDate(parts[0]); // YYYYMMDD (예: '20251214')
    const slotNumber = parseInt(parts[1], 10); // XX 슬롯 번호 (예: 05 -> 5)

    // 2. 슬롯 번호를 'HH:MM' 형식의 시간으로 변환합니다.

    // 총 분(Minutes) 계산 (슬롯 번호 * 30분)
    const totalMinutes = slotNumber * 30;

    // 시간(Hour) 계산 (총 분 / 60)
    const hour = Math.floor(totalMinutes / 60);

    // 분(Minute) 계산 (총 분 % 60)
    const minute = totalMinutes % 60;

    // 3. 시간과 분을 2자리 문자열로 포맷팅합니다.
    const hourStr = String(hour).padStart(2, '0'); // 예: 5 -> '05'
    const minuteStr = String(minute).padStart(2, '0'); // 예: 0 -> '00', 30 -> '30'

    const time = `${hourStr}:${minuteStr}`; // HH:MM (예: '02:30')

    // 4. 최종 'YYYYMMDD HH:MM' 문자열을 반환합니다.
    return `${date} ${time}`;
}

export function formatToKoreanDate(dateStr: string): string {
    // 입력 문자열에서 YYYY, MM, DD 추출
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);

    // Date 객체를 생성 (JavaScript의 월은 0부터 시작하므로 -1)
    // Date 객체 생성 시 YYYY-MM-DDT00:00:00 형태로 문자열을 전달하는 것이 가장 안전합니다.
    const date = new Date(`${year}-${month}-${day}T00:00:00`);

    // 1. 년도를 YY 형식으로 추출 ('2025' -> '25')
    const shortYear = year.slice(2);

    // 2. 요일(EEE)을 추출하기 위한 배열
    // 한국어 요일: 일, 월, 화, 수, 목, 금, 토
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const dayIndex = date.getDay(); // 0(일요일)부터 6(토요일)까지의 인덱스
    const weekday = weekdays[dayIndex];

    // 3. 최종 형식으로 결합
    // YY년 MM월 DD일 (EEE)
    return `${shortYear}년 ${month}월 ${day}일 (${weekday})`;
}

/**
 * 30분 슬롯 번호(0-47)를 해당 슬롯의 시작 시간(HH:MM)으로 변환합니다.
 * @param slot 하루 중 30분 단위 슬롯 번호 (0-47)
 * @returns 'HH:MM' 형식의 시간 문자열 (예: '02:30')
 */
function slotNumberToTime(slot: number): string {
    const totalMinutes = slot * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    const hourStr = String(hour).padStart(2, '0');
    const minuteStr = String(minute).padStart(2, '0');

    return `${hourStr}:${minuteStr}`;
}

/**
 * 'YYYYMMDD-XX' 형식의 슬롯 코드 리스트를 받아 연속적인 슬롯들을 그룹화하여 
 * 'YYYYMMDD HH:MM ~ HH:MM' 형식의 기간 리스트로 변환합니다.
 * * @param slotCodes 'YYYYMMDD-XX' 형식의 슬롯 코드 문자열 배열
 * @returns 'YYYYMMDD HH:MM ~ HH:MM' 형식의 기간 문자열 배열
 */
export function groupAdjacentSlots(slotCodes: string[]): string[] {
    if (slotCodes.length === 0) {
        return [];
    }

    // 슬롯 코드를 날짜와 슬롯 번호로 파싱하여 정렬합니다.
    const parsedSlots = slotCodes.map(code => {
        const [datePart, slotPart] = code.split('-');
        return {
            date: datePart,
            slot: parseInt(slotPart, 10),
            originalCode: code
        };
    }).sort((a, b) => {
        // 날짜를 기준으로 먼저 정렬하고, 슬롯 번호를 기준으로 다시 정렬합니다.
        if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
        }
        return a.slot - b.slot;
    });

    const groupedRanges: string[] = [];

    // 현재 그룹의 시작 인덱스
    let startSlotIndex = 0;

    for (let i = 1; i <= parsedSlots.length; i++) {
        // 현재 슬롯과 다음 슬롯을 비교합니다. (배열 끝에 도달하면 i == parsedSlots.length)
        const currentSlot = parsedSlots[i - 1];
        const nextSlot = parsedSlots[i];

        // 연속성이 끊어지는 조건:
        // 1. 배열의 끝에 도달했을 때
        // 2. 날짜가 바뀌었을 때
        // 3. 슬롯 번호가 정확히 1만큼 증가하지 않았을 때 (예: 07 다음에 12가 오는 경우)
        const isEndOfGroup =
            i === parsedSlots.length ||
            currentSlot.date !== nextSlot.date ||
            nextSlot.slot !== currentSlot.slot + 1;

        if (isEndOfGroup) {
            // 그룹의 시작 슬롯과 끝 슬롯을 가져옵니다.
            const startSlot = parsedSlots[startSlotIndex];
            // 그룹의 끝 슬롯은 현재 슬롯(i-1)입니다.
            const endSlot = currentSlot;

            // 시작 시간: 시작 슬롯 번호에 해당하는 시간
            const startTime = slotNumberToTime(startSlot.slot);

            // 종료 시간: 끝 슬롯 번호의 '다음' 슬롯의 시작 시간.
            // 연속 슬롯이 끝나는 시간을 표현하기 위해 (끝 슬롯 번호 + 1)을 사용합니다.
            const endSlotForTime = endSlot.slot + 1;
            const endTime = slotNumberToTime(endSlotForTime);

            // 최종 기간 형식: YYYYMMDD HH:MM ~ HH:MM
            const periodString = `${formatToKoreanDate(startSlot.date)} ${startTime} ~ ${endTime}`;
            groupedRanges.push(periodString);

            // 다음 그룹의 시작 인덱스를 현재 위치로 이동시킵니다.
            startSlotIndex = i;
        }
    }

    return groupedRanges;
}