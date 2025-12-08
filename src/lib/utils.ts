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