# GitHub Pages + GitHub Actions 배포 방법

이 폴더를 별도 GitHub 저장소로 올리면, GitHub Actions가 1시간마다 위키독스 조회수를 수집하고 GitHub Pages에 정적 대시보드를 게시합니다.

## 1. 저장소 만들기

1. GitHub에서 새 저장소를 만듭니다.
2. 이 `wikidocs_dashboard` 폴더의 파일들을 저장소 루트로 push합니다.
3. `.env` 파일은 올리지 않습니다.

## 2. 토큰 Secret 등록

저장소에서 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`으로 이동해 아래 Secret을 등록합니다.

- Name: `WIKIDOCS_TOKENS`
- Value: `.env`에 있던 토큰 전체를 쉼표로 이어 붙인 값

예:

```text
token1,token2,token3
```

## 3. GitHub Pages 설정

저장소에서 `Settings` → `Pages`로 이동해 `Build and deployment`의 Source를 `GitHub Actions`로 설정합니다.

## 4. 첫 실행

`Actions` 탭에서 `Publish Wikidocs Dashboard` workflow를 선택하고 `Run workflow`를 누릅니다.

첫 실행이 끝나면:

- `data/catalog.json`
- `data/snapshots.jsonl`
- `data/daily_blog_views.csv`
- `data/daily_cumulative_views.csv`

파일이 저장소에 자동 커밋됩니다. 이 파일들이 다음 실행 때 과거 데이터 역할을 합니다.

## 5. 자동 갱신

`.github/workflows/pages.yml`은 매시 7분마다 실행됩니다.

```yaml
schedule:
  - cron: "7 * * * *"
```

GitHub Actions의 cron은 UTC 기준입니다. 정확히 정각에 실행된다는 보장은 없지만, 무료로 주기적 수집과 Pages 배포를 하기에는 가장 단순한 방식입니다.

## 주의

- GitHub Pages는 기본적으로 공개 사이트입니다.
- 위키독스 토큰 값은 Secret에만 저장되며 사이트에는 노출되지 않습니다.
- 조회수 통계 JSON/CSV는 사이트에 공개됩니다.
- 과거 일자별 조회수는 위키독스가 원천 데이터를 제공하지 않으므로, 이 시스템이 저장한 날짜부터 정확히 누적됩니다.
