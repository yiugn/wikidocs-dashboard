# Wikidocs Blog Views Dashboard

위키독스 블로그 토큰으로 블로그/포스팅 목록을 가져오고, 공개 블로그 페이지의 현재 누적 조회수를 수집해 로컬 대시보드로 시각화합니다.

## 실행

```powershell
cd "C:\Users\진헬스 진료실 11\Documents\New project\wikidocs_dashboard"
python server.py --open
```

서버 시작 시 오늘 스냅샷이 없으면 자동으로 수집합니다. 서버가 계속 켜져 있으면 15분마다 날짜 변경 여부를 확인하고, 새 날짜에는 하루 1회 자동 수집을 시작합니다.

## 화면

- `요약`: 블로그별 누적 조회수, 전체 누적 추이, 상위 포스팅
- `일별 추이`: 블로그별/전체 일단위 조회수 그래프, 블로그별/전체 일단위 누적 조회수 그래프

## 데이터 저장

- 토큰: `.env`
- 블로그/글 목록 캐시: `data/catalog.json`
- 날짜별 스냅샷 원본: `data/snapshots.jsonl`
- 일단위 조회수 CSV: `data/daily_blog_views.csv`
- 일단위 누적 조회수 CSV: `data/daily_cumulative_views.csv`

같은 날짜에 다시 수집하면 해당 날짜 스냅샷을 최신 값으로 갱신합니다. 이전 날짜는 저장된 JSONL/CSV에서 재사용합니다.

## 중요한 한계

위키독스 API와 공개 블로그 HTML은 현재 누적 조회수만 제공합니다. 과거 날짜별 실제 조회수 원본은 제공되지 않으므로, 앱을 설치하기 전 날짜의 실제 일별 조회수는 복원할 수 없습니다. 첫 스냅샷 날짜부터는 실제 관측값 기준으로 일별 증가분을 저장합니다.
