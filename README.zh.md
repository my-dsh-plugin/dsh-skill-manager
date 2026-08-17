# dsh-skill-manager

在 DeepSeek Harness 的设置页中,从 GitHub 仓库**安装、更新、卸载 Skills**;按层级(项目/全局/捆绑/Claude 兼容)分组展示当前已加载的技能,并可选只读加载 Claude Code 的 `.claude/skills`。

> English: [README.md](README.md)

## 功能

- **从任意 GitHub 来源安装技能**:`owner/repo`、`owner/repo/sub/path`,可加 `@tag`(也支持粘贴 `https://github.com/...` 链接);自动识别仓库常见的 `skills/` 目录约定。
- **更新 / 卸载**本插件安装过的技能,安装清单保存在 `<dshHome>/.skill-manager/manifest.json`。
- **已加载技能总览**:实时读取 `ctx.skills` 目录,按层级分组(项目级 / 用户级 / 自定义 / 捆绑),一目了然当前生效的技能与覆盖关系。
- **GitHub 下载代理**:页面内一键配置(如 `http://127.0.0.1:10808`,支持混合代理)。
- **Claude Code 兼容**(默认开启,可关):注册一个只读技能 Provider,加载项目根目录 `.claude/skills/<name>/SKILL.md` —— 与 DSH 同属 SKILL.md + YAML frontmatter 规范,零文件复制。

## 工作原理

Harness 原生拥有技能加载能力:`dsh-skill-filesystem` 监视技能根目录、写入即热加载,`dsh-tool-skill` 把目录注入每个会话。因此**"安装技能"本质只是文件操作** —— 本插件下载 codeload tarball、校验 frontmatter(kebab-case `name`、非空 `description`)、把技能包复制到 `<dshHome>/skills/<name>/`。不需要注册表写入、不需要重启、不需要核心补丁。

设置页与 Host 端通过插件自有 settings 命名空间(`skill-manager`)通信 —— 复用标准 settings 通道,无需自定义 RPC。命令严格串行执行,结果写回同一命名空间。

可选的 `.claude/skills` 兼容 Provider 以 rank 250 注册到 `ctx.skills`(介于原生项目级与用户级之间),同名项目技能仍然优先。

## 环境要求

- Harness 需挂载技能能力(`dsh-skill` / `dsh-skill-filesystem` / `dsh-tool-skill`)—— 当前桌面版默认自带。
- **一行暴露补丁**(与 thinking-level-override 相同的先例):Web 客户端只能读写网关白名单内的 settings 命名空间。在 `packages/host/apiproxy/src/api-proxy.ts` 的 `WEB_SETTINGS_NAMESPACES` 中(源码构建)或预构建部署的 `@deepseek-ai/dsh-host-apiproxy/lib/index.js` 对应常量中加入 `'skill-manager'`,然后重启;否则 Skills 页面只读。

## 安装

**消费者无需构建插件** —— 仓库随附预构建的 Host 入口与浏览器 bundle(`lib/`,已提交)。两条路线:

- **Web / 自托管 Harness**(源码或开发构建,例如从 harness checkout 跑 `pnpm dev`)—— 见下。
- **DeepSeek Harness Desktop(Tauri 桌面端)** —— 一键脚本,见下一节。

### Web / 自托管 Harness

```sh
# 本地克隆(推荐迭代) —— 以 link 方式安装
git clone https://github.com/my-dsh-plugin/dsh-skill-manager.git
pnpm dsh plugin add --profile web /path/to/dsh-skill-manager

# 或直接从 git 安装
pnpm dsh plugin add --profile web github:my-dsh-plugin/dsh-skill-manager
```

(`dsh` CLI 使用你的 Harness checkout 中的;若 `DSH_HOME` 非默认 `~/.dsh` 请自行设置。)

> **白名单:** 源码/开发构建上,还需在 `packages/host/apiproxy/src/api-proxy.ts` 的
> `WEB_SETTINGS_NAMESPACES` 中加入 `'skill-manager'`(见"环境要求"),否则 Skills 页只读。

### DeepSeek Harness Desktop(桌面端)一键安装

**桌面端用户无需构建任何东西。** 在**普通终端**(不要在 App 自带的 harness 会话里跑——那里的应用安装目录和 App 数据目录是沙箱/只读的,macOS 尤其如此)执行一次:

```sh
bash <(curl -Ls https://raw.githubusercontent.com/my-dsh-plugin/dsh-skill-manager/main/scripts/install-desktop.sh) --restart
```

脚本幂等,全自动完成:

1. **从 GitHub 拉取插件**(仓库随附预编译 `lib/`,无需构建),并用 npm 安装运行时依赖(`tar`、`yaml`、`https-proxy-agent`、`@deepseek-ai/schemastery`)
2. **打白名单补丁** —— 在内嵌 harness 的 `@deepseek-ai/dsh-host-apiproxy/lib/index.js` 的 `WEB_SETTINGS_NAMESPACES` 追加 `"skill-manager"`,使 Skills 设置页**可读写**(否则该页只读)
3. **装入桌面 profile**(`profiles/web/node_modules/`)并在 `dsh.profile.bundles` 注册
4. **重启桌面 App**(`--restart`),之后 **设置 → Skills** 出现

前提:机器可访问 GitHub(支持 `GITHUB_MIRROR` / 代理环境变量),且当前终端对应用安装目录与 App 数据目录有写权限。可用环境变量覆盖:`DSH_DESKTOP_APP`、`DSH_DESKTOP_HOME`、`DSH_SKILL_SOURCE_DIR`(改用本地克隆)。

> **其他最终用户(使用已发布桌面包):** 完全无需手动操作 —— 升级到包含打过补丁的 harness 和已 seed 插件的版本,重启即可,Skills 页开箱即用。

手动等价做法是编辑 profile 的 `package.json`:

```json
"dependencies": {
  "dsh-skill-manager": "link:/path/to/dsh-skill-manager"
}
```

```json
"dsh": {
  "profile": {
    "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-skill-manager"]
  }
}
```

然后在 profile 目录执行 `pnpm install`,重启 Harness。设置页将出现 **技能 (Skills)** 条目(位于插件管理区块之后)。

## 使用

打开 设置 → **技能 (Skills)**:

- **安装新技能** —— 粘贴来源(`owner/repo[/path][@tag]`),安装到 `<dshHome>/skills`;同名已存在时报告冲突且不覆盖(改用对应条目的 **更新**)。
- **已由本插件管理** —— 每个已安装技能及其来源、版本与时间戳;**更新** 重新拉取记录的来源(未固定 tag 时取默认分支 HEAD),**卸载** 删除目录与清单记录;Harness 都会热感知。
- **当前已加载** —— 按层级分组展示;`已加载` 徽标标记当前目录中生效的插件管理技能。
- **GitHub 下载代理** —— 需要代理的环境(如 `http://127.0.0.1:10808`)开启并填地址。
- **Claude Code 兼容** —— 开关只读 `.claude/skills` Provider。

## 开发

构建仅用于**修改插件本身**,消费者从不构建。需要 sibling 的 `deepseek-harness` checkout(`../deepseek-harness`)提供项目引用与共享客户端预设:

```sh
pnpm install
pnpm test       # vitest:source/frontmatter/installer/provider/controller 五组测试
pnpm typecheck  # tsc -b(src + client)
pnpm build      # tsc 声明 + tsdown Host 入口 + 客户端 bundle 到 lib/
```

构建后请提交 `lib/`,保证消费者始终拿到预构建产物。

## 已知限制与后续工作

- **安装目标仅限用户级**(`<dshHome>/skills`),暂不提供项目级安装。
- **已加载列表反映 Host 进程当前工作目录**:其他项目的 `.dsh/skills` 技能只有在该项目成为工作目录时才可见。
- **更新使用记录的来源**:未固定 `@tag` 时重新拉取默认分支 HEAD。
- **`.claude/skills` Provider 无文件监视**:改动在下次目录失效时(如下一会话或任意技能变更)才生效,非即时。
- 格式异常的技能条目按设计跳过并告警(与原生发现一致);来源中所有 frontmatter 均无效时会在结果中明确报告。

## License

Apache-2.0