# CTT Explorer

성경 전체 `CTT` 구조 탐색을 목표로 하는 정적 웹앱입니다.  
현재 공개 빌드는 다니엘서 데이터만 포함하지만, 제품명, manifest 구조, 책 선택 UI는 전체 성경 확장을 전제로 설계했습니다.

## 핵심 기능

- 전체 성경 66권 목록 표시
- 현재 지원 책만 활성화하고, 미지원 책은 `준비 중` 상태로 표기
- `Tree view` / `List view` 전환
- 절 선택 시 상세 패널 표시
- `text type`, `ctype`, direct speech 시각 강조
- 히브리어 표기 토글
- gloss 토글
- 한글 직역 토글
- clause type 하이라이트 필터
- verse jump
- 현재 책/장/뷰/선택 노드 URL 상태 유지
- 절별 미정렬 직역 보조 패널

## 기술 구성

- `Vite + React + TypeScript`
- 정적 데이터 빌드 스크립트: `Python 3`
- 테스트:
  - Python `unittest` for CTT parsing and manifest structure checks
  - `node:test` + `tsx --test` for frontend utility checks

## 빠른 시작

```bash
npm install
npm run data:fetch
npm test
npm run build
```

개발 서버:

```bash
npm run dev
```

빌드 결과물은 `docs/`에 생성됩니다.

## 데이터 파이프라인

원본 CTT 파일 fetch:

```bash
npm run data:fetch
```

정적 JSON 생성:

```bash
npm run data:build
```

생성 결과:

- `public/data/manifest.json`
- `public/data/chapters/DAN-01.json` ... `DAN-12.json`

`manifest.json`은 전체 성경 66권 카탈로그를 포함하며, 현재는 `DAN`만 `available` 상태로 채워집니다.  
소스 데이터는 `source-data/ctt/daniel/` 아래에 저장되고, 한글 직역 CSV는 `source-data/literal/bible-viewer-korean-literal.csv`로 저장됩니다.

직역 데이터는 `BangKeonwoong/bible-viewer`의 `성경 직역 정보 2.csv`를 빌드 시점에 받아와, Daniel 각 절 내부에서 보수적으로 clause atom에 정렬합니다.

- 유일 일치만 노드에 부착
- 모호한 행은 강제 매칭하지 않음
- 미정렬 행은 절 상세 패널의 `미정렬 직역` 섹션에 표시

## BHSA 보강

`scripts/build_dataset.py`는 `Text-Fabric`과 로컬 `BHSA` 데이터가 있으면 히브리어 표기와 gloss를 더 풍부하게 보강합니다.  
해당 환경이 없으면 CTT ASCII 표면형을 히브리 자모로 변환한 fallback 데이터를 사용합니다.

즉:

- 기본 상태: 앱 빌드 가능
- BHSA/Text-Fabric 설치 상태: 보강 데이터 포함 가능

## GitHub Pages 배포

현재 저장소는 `main` 브랜치의 `docs/` 디렉터리를 GitHub Pages 소스로 사용합니다.

배포 절차:

1. `npm run data:fetch`
2. `npm test`
3. `npm run build`
4. 생성된 `docs/`를 포함해 `main` 브랜치에 push
5. GitHub Pages source를 `Deploy from a branch` / `main` / `/docs`로 설정

기본 공개 URL 형식:

`https://<github-username>.github.io/ctt-explorer/`

## 라이선스와 출처

이 저장소의 앱 코드 자체는 MIT 라이선스를 사용합니다.  
다만 데이터 출처는 별도 조건을 따릅니다.

- CTT source: `ETCBC/CTT`
- BHSA source: `ETCBC/bhsa`
- Processing layer: `Text-Fabric`
- Korean literal source: `BangKeonwoong/bible-viewer` / `성경 직역 정보 2.csv`

BHSA 데이터는 `CC BY-NC 4.0` 조건이 적용되므로, 이 프로젝트는 비상업 목적과 명시적 출처 표기를 전제로 합니다. 한글 직역 CSV 역시 원 출처를 유지해 사용합니다.
