This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## 개요
--- 홈 스크린 ---
1. 달력 -> 자신과 연관된 일정들 표기(확정, pending 별도 색상 구분, hover시 확인)
2. oauth 구글, 카카오, 디스코드를 활용한 회원가입, 로그인 기능
3. pending, 확정, 예정 일정 리스트
4. 일정 생성 기능
5. 초대 코드를 입력할 시 일정 참가 할 수 있음
--- 일정 생성 스크린 ---
6. 제목, 설명 textfield
7. 일정 생성시 새로운 스크린으로 안내, 일정 초대 비밀 코드 제공, 무료 사용자의 경우 최대 5인 까지 초대 가능함, 
8. 기간을 정할 수 있는 일정 달력 제공 - 일정 생성자만 조작 가능
--- 일정 조회 스크린 (수정) ---
9. 주어진 기간 내에 자신이 가능한 일정을 정할 수 있는 횡 스크롤 가능한 30분 단위의 일간 테이블 제공
10. 일간 테이블에서 모든 유저는 드레그 하여 자신이 참가 가능한 일정 선택 
11. 다시 드레그 하여 일정 수정 하거나 임의의 버튼을 눌러 전체 일정 취소
--- 일정 조회 스크린 (조회) ---
12. 일정 가능한 인원 / 총 인원 으로 스케일 하여 0 / n 일 때 하얀색 n-1/n 일 때 초록색, k/n 일 때 0~n-1 / n 만큼의 색상 lightness를 주어 히트맵 처럼 표시, n/n 일 경우 파란색 색상을 주어 모든 인원이 가능함을 별도 표기
13. 최대한 많은 사람들이 가능한 순으로 시간대에 순위를 주어 리스트를 작성
14. 일정 생성자가 최종적으로 타임테이블을 드레그 하여 일정을 정하고 확정 버튼을 눌러 최종 일정 확인을 함.
15. 최종 일정 확인시 연동된 discord bot 이나 카카오 봇으로 메세지를 보낼 수 있도록 처리. 실제 로직은 추가하지 않고 empty function으로 처리.