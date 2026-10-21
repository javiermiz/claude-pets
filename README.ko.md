# Claude Pets

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh.md) · **한국어**

[Claude Code](https://claude.com/claude-code) 세션이 8비트 펫이 되어 Mac 화면 아래쪽을 돌아다닙니다.

![Claude Pets](docs/zoo.png)

![Workers](docs/workers.png)

- **이 Mac에서 작업 중인 세션마다 펫이 하나씩 생깁니다.** 같은 세션에는 항상 같은 동물(총 23종)이 배정되고, 머리 위에 이름이 표시됩니다.
- **두 가지 스타일**을 🐾 메뉴에서 고를 수 있어요: 돌아다니는 펫, 또는 책상에서 타이핑하는 사무실 **직원**. 세션에 서브에이전트가 있으면 테이블에 모여 **팀 회의**를 하고, 끝나면 기뻐서 펄쩍 뜁니다.
- **말풍선**에 각 에이전트가 지금 하는 일(⌨️ 명령어, ✏️ 편집 중인 파일…)이나, 당신 차례일 때는 마지막으로 한 말이 표시됩니다.
- **짧은 요약**(선택): `claude` CLI에 로그인되어 있으면 Claude Haiku가 각 말풍선에 7단어 요약을 써 줍니다. 구독을 사용합니다.
- 세션이 작업 중에서 당신의 답장을 기다리는 상태로 바뀌면 **알림**(소리 포함)이 옵니다. 누르면 그 세션이 열립니다.
- **작업 중**인 펫은 돌아다니고, **완료**된 펫은 초록색 ✓와 함께 누워서 클릭을 기다립니다.
- 펫을 **클릭**하면 Claude 데스크톱 앱에서 해당 세션이 열립니다.
- **마우스를 올리면** 프로젝트, 상태, 경과 시간, 하위 세션, 실행 중인 서브에이전트가 담긴 카드가 나타납니다.
- **서브에이전트**는 작은 펫이 되어 부모 세션 뒤를 줄지어 따라갑니다. 다른 세션에서 시작된 **하위 세션**에는 `↳`가 붙습니다.
- **백그라운드 작업도 셉니다:** 백그라운드 명령이나 서브에이전트를 기다리는 세션은 끝날 때까지 ⏳를 표시합니다. 10분 넘게 실행 중인 명령(감시, 서버)은 세지 않습니다.
- 빈 공간의 **클릭은 그대로 통과**하므로 작업에 방해가 되지 않습니다.
- **여러 언어 지원:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (Mac 언어, 또는 메뉴의 🌐에서 고른 언어).

![Walk cycle](docs/cat-walk.png)

## 설치

macOS 14 이상과 Xcode Command Line Tools(`xcode-select --install`)가 필요합니다.

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

설치 스크립트가 Mac에서 소스로 앱을 빌드해 `~/Applications/ClaudePets.app`에 넣습니다. 이후에는 Spotlight("Claude Pets")에서 열 수 있습니다.

또는 클론해서 설치:

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

**또는 빌드된 앱을 내려받으세요:** [Releases](https://github.com/javiermiz/claude-pets/releases/latest)에서 `ClaudePets.zip`을 받아 압축을 풀고 `ClaudePets.app`을 응용 프로그램 폴더로 옮기세요. Apple의 공증을 받지 않았기 때문에 처음에는 macOS가 실행을 막습니다. **시스템 설정 → 개인정보 보호 및 보안**에서 **그래도 열기**를 누르거나, `xattr -dr com.apple.quarantine /Applications/ClaudePets.app`를 실행하세요.

메뉴 막대의 🐾에서 **로그인 시 열기**와 **종료**를 선택할 수 있습니다. 펫을 우클릭해도 종료됩니다.

업데이트하려면 설치 명령을 다시 실행하세요. 제거하려면 앱을 종료하고 `~/Applications/ClaudePets.app`을 삭제하세요.

## 작동 방식

모든 것이 로컬에서 읽기 전용으로 동작합니다. Mac 밖으로 나가는 것은 선택 사항인 요약뿐입니다(제한 사항 참고).

| 항목 | 출처 |
| -- | -- |
| 세션, 이름, 작업 중/대기 | `~/.claude/sessions/<pid>.json` |
| 서브에이전트(최근 60초 안에 기록되었으면 실행 중, 설명은 `*.meta.json`에서) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| 하위 세션(부모 세션의 기록에서) | `start_session` → `session_id: local_…` |
| 백그라운드 명령(자식 프로세스) | `zsh`/`bash` ⟵ `claude` |
| 세션 열기(데스크톱 앱 딥 링크) | `claude://code/continue?session=<id>` |
| 말풍선(최근 작업, 마지막 메시지) | `assistant` → `tool_use` / `text` |
| 짧은 요약(선택) | `claude -p --model haiku` |

제한 사항:

- 이 Mac의 세션만 표시됩니다. 클라우드 세션은 `~/.claude`에 기록하지 않습니다.
- 앱을 실행한 뒤 작업 중이었던 세션만 표시됩니다.
- 요약은 세션 작업의 짧은 일부(마지막 요청, 최근 작업 또는 마지막 메시지)를 당신의 Claude Code 로그인을 통해 Anthropic에 보냅니다. CLI에 로그인하지 않으면 아무것도 보내지 않습니다.

## 픽셀 아트 바꾸기

스프라이트는 픽셀 아트용 언어 pxl로 [`pets.px.js`](pets.px.js)에 코드로 작성되어 있습니다. 각 동물은 16×9 몸통과 다리 스타일로 이루어지며, 걷기 동작·외곽선·누운 자세가 여기서 생성됩니다. 생성된 스프라이트는 `assets/`에 있으므로 앱을 빌드할 때 pxl이 필요하지 않습니다. 수정한 뒤에는 아트를 다시 생성하고 다시 빌드하세요:

```sh
./sprites.sh && ./build.sh
```
