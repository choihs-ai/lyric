# Kinetic Lyric Motion

음원과 가사만 넣으면 곡을 분석해서 키네틱 타이포그래피 가사 영상을 만들어 주는 웹 엔진.

**열기:** https://choihs-ai.github.io/lyric/

## 쓰는 법
1. 음원 파일 선택 → 박자·킥·구간·분위기 자동 분석
2. 가사 붙여넣기 — `Intro` / `Verse 1` / `Chorus` / `Verse 2 - 이름` / `Outro` 구간 제목, `*강조*`, `**최대 강조**`, `(추임새)`
3. 아트 디렉션 확인 (BRUTAL · NEON · EDITORIAL · POP · LO-FI · CINEMATIC) — 자동 추천 / AI 디렉터 / 직접 선택
4. 탭 싱크로 줄 타이밍 맞추기 (한 번 하면 저장)
5. 녹화해서 영상 저장

가사는 이 저장소에 들어가지 않고, 입력한 기기 안에만 저장됩니다.

## 개발
`src/`를 고치고 `python3 build.py` → `node tools/smoke.js`. 자세한 구조는 `CLAUDE.md`.
