#!/usr/bin/env bash
# dsh-skill-manager — one-shot installer for DeepSeek Harness Desktop
#
# Fetches the plugin straight from GitHub and installs it into the desktop app:
#   1. appends "skill-manager" to the embedded harness WEB_SETTINGS_NAMESPACES
#      allowlist (so the Skills settings card is read/write),
#   2. installs the plugin bundle into the desktop web profile,
#   3. registers the bundle, then (optionally) restarts the app.
#
# Usage (run in a normal terminal — NOT a sandboxed harness shell, because the
# app bundle and app-data dir are protected there):
#   bash <(curl -Ls https://raw.githubusercontent.com/my-dsh-plugin/dsh-skill-manager/main/scripts/install-desktop.sh) --restart
# or, after cloning:
#   bash scripts/install-desktop.sh [--restart]
#
# Idempotent: safe to re-run; already-applied steps are skipped.
#
# Overrides:
#   DSH_SKILL_SOURCE_DIR  - use a local plugin checkout/pack instead of GitHub
#   DSH_DESKTOP_APP       - explicit path to the desktop app bundle/install dir
#   GITHUB_MIRROR         - alternative base for the git/curl fetch
set -u

REPO="my-dsh-plugin/dsh-skill-manager"
BRANCH="main"
PLUGIN_NAME="dsh-skill-manager"
RESTART="${1:-}"

die() { echo "x $*" >&2; exit 1; }

# ---- resolve platform / app / home -----------------------------------------
OS="$(uname -s)"
case "$OS" in
  Darwin)
    APP="${DSH_DESKTOP_APP:-/Applications/DeepSeek Harness Desktop.app}"
    HOME_DIR="${DSH_DESKTOP_HOME:-$HOME/Library/Application Support/dsh-desktop/dsh-home}"
    NPM_FALLBACK="$APP/Contents/Resources/runtime/node/bin/npm"
    ;;
  Linux)
    APP="${DSH_DESKTOP_APP:-/opt/DeepSeek Harness Desktop}"
    HOME_DIR="${DSH_DESKTOP_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/dsh-desktop/dsh-home}"
    NPM_FALLBACK=""
    ;;
  MINGW*|MSYS*|CYGWIN*)
    APP="${DSH_DESKTOP_APP:-$LOCALAPPDATA/Programs/DeepSeek Harness Desktop}"
    HOME_DIR="${DSH_DESKTOP_HOME:-$APPDATA/dsh-desktop/dsh-home}"
    NPM_FALLBACK="$APP/Resources/runtime/node/npm.cmd"
    ;;
  *) die "未支持的系统: $OS" ;;
esac

[ -d "$APP" ] || die "找不到桌面 App: $APP (可用 DSH_DESKTOP_APP 指定)"
PROFILE_DIR="$HOME_DIR/profiles/web"
[ -d "$PROFILE_DIR" ] || die "找不到桌面 profile: $PROFILE_DIR (可用 DSH_DESKTOP_HOME 指定)"

echo "==> OS        : $OS"
echo "==> App       : $APP"
echo "==> profile   : $PROFILE_DIR"

# ---- 0. get the plugin source ----------------------------------------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
if [ -n "${DSH_SKILL_SOURCE_DIR:-}" ]; then
  echo "==> 使用本地源: $DSH_SKILL_SOURCE_DIR"
  SRC="$DSH_SKILL_SOURCE_DIR"
  [ -f "$SRC/lib/index.js" ] || die "本地源缺少 lib/index.js"
else
  echo "==> 从 GitHub 拉取 $REPO ($BRANCH) ..."
  GIT_BASE="${GITHUB_MIRROR:-https://github.com}"
  if command -v git >/dev/null 2>&1; then
    git clone --depth 1 --branch "$BRANCH" "$GIT_BASE/$REPO.git" "$TMP/plugin" >/dev/null 2>&1 \
      || { git clone --depth 1 "$GIT_BASE/$REPO.git" "$TMP/plugin" >/dev/null 2>&1; }
  fi
  if [ ! -f "$TMP/plugin/lib/index.js" ]; then
    # fallback: codeload tarball (no git binary needed)
    CURL_BASE="${GITHUB_MIRROR:-https://codeload.github.com}"
    mkdir -p "$TMP/tgz"
    curl -fsSL "$CURL_BASE/$REPO/tar.gz/refs/heads/$BRANCH" -o "$TMP/plugin.tgz" \
      || die "GitHub 拉取失败, 请检查网络/代理"
    tar -xzf "$TMP/plugin.tgz" -C "$TMP/tgz" --strip-components=1
    mv "$TMP/tgz" "$TMP/plugin"
  fi
  [ -f "$TMP/plugin/lib/index.js" ] || die "拉取到的插件缺少 lib/index.js"
  SRC="$TMP/plugin"
fi

# ---- 1. whitelist patch (idempotent) ---------------------------------------
# The allowlist constant lives in the embedded harness's built apiproxy lib.
VERSION="$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('$APP/Contents/Resources/runtime/harness/current.json')))['version'])" 2>/dev/null)"
APIF="$APP/Contents/Resources/runtime/harness/versions/$VERSION/node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js"
# Windows uses Resources (no Contents/Resources nesting)
if [ ! -f "$APIF" ]; then
  VERSION="$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('$APP/Resources/runtime/harness/current.json')))['version'])" 2>/dev/null)"
  APIF="$APP/Resources/runtime/harness/versions/$VERSION/node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js"
fi
if [ -f "$APIF" ]; then
  if grep -q '"skill-manager"' "$APIF"; then
    echo "==> 白名单: 已含 skill-manager, 跳过"
  else
    python3 - "$APIF" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
old = '\t"thinking-level-override"\n];'
new = '\t"thinking-level-override",\n\t"skill-manager"\n];'
if s.count(old) != 1:
    raise SystemExit('未找到待修补的模式, 请核对:' + p)
open(p, 'w').write(s.replace(old, new))
print('==> 白名单: 已加入 skill-manager')
PY
  fi
else
  echo "==> 警告: 未找到内嵌 apiproxy, 跳过白名单补丁 (确认 App 已安装内置 harness)"
fi

# ---- 2. install runtime dependencies ---------------------------------------
# The repo ships prebuilt lib/ but not node_modules; npm pulls the runtime deps
# (tar / yaml / https-proxy-agent / @deepseek-ai/schemastery) into the copy.
NPM="$(command -v npm 2>/dev/null || true)"
[ -z "$NPM" ] && [ -n "$NPM_FALLBACK" ] && [ -x "$NPM_FALLBACK" ] && NPM="$NPM_FALLBACK"
if [ -n "$NPM" ]; then
  echo "==> 安装运行时依赖 (npm) ..."
  # --cache 指向临时目录: 避免污染/依赖 ~/.npm, 也兼容受限环境
  ( cd "$SRC" && "$NPM" install --omit=dev --no-save --no-audit --no-fund --no-package-lock --cache "$TMP/.npm-cache" ) \
    || echo "==> 警告: 依赖安装失败, 插件可能无法解析 tar/https-proxy-agent"
else
  echo "==> 警告: 找不到 npm, 跳过依赖安装 (插件可能无法解析运行时三方的依赖)"
fi

# ---- 3. install plugin into desktop profile --------------------------------
TGT="$PROFILE_DIR/node_modules/$PLUGIN_NAME"
mkdir -p "$PROFILE_DIR/node_modules"
[ -d "$TGT" ] && { echo "==> 插件: 已存在, 更新覆盖"; rm -rf "$TGT"; }
cp -R "$SRC" "$TGT"
rm -rf "$TGT/.git"
echo "==> 插件: 已装入 $TGT"

# ---- 4. register bundle (idempotent) ---------------------------------------
# 防御: profile 缺 package.json 时先生成最小骨架
if [ ! -f "$PROFILE_DIR/package.json" ]; then
  cat > "$PROFILE_DIR/package.json" <<JSON
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {},
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]
    }
  }
}
JSON
  echo "==> profile: 已生成 package.json 骨架"
fi
python3 - "$PROFILE_DIR/package.json" "$PLUGIN_NAME" <<'PY'
import json, sys
p, name = sys.argv[1], sys.argv[2]
d = json.load(open(p))
bl = d.setdefault('dsh', {}).setdefault('profile', {}).setdefault('bundles', [])
if name not in bl:
    bl.append(name)
    print('==> bundle: 已注册 ' + name)
else:
    print('==> bundle: 已存在, 跳过')
with open(p, 'w') as f:
    json.dump(d, f, indent=2)
PY

# ---- 5. restart (optional) --------------------------------------------------
if [ "$RESTART" = "--restart" ]; then
  echo "==> 重启桌面 App ..."
  case "$OS" in
    Darwin) osascript -e 'quit app "DeepSeek Harness Desktop"' 2>/dev/null; sleep 2; open "$APP" ;;
    Linux)  pkill -f 'DeepSeek Harness Desktop' 2>/dev/null; sleep 1; nohup "$APP" >/dev/null 2>&1 & ;;
    *)      echo "==> 请手动重启桌面 App" ;;
  esac
  echo "==> 已重启, 稍后到 Settings -> Skills 查看"
else
  echo "==> 完成。请重启桌面 App (或加 --restart 重新执行)"
fi