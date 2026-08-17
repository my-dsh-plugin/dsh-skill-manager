window.__ModuleLoader__.load({
	id: "dsh-skill-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/shared.ts
		/** Settings namespace this plugin registers on both halves. */
		const SETTINGS_NS = "skill-manager";
		//#endregion
		//#region \0dsh-css:D:\Workspace\Suninx\my-dsh-plugin\dsh-skill-manager\src\client\section.module.css.mjs
		const css = ".bkB_ZW_section{flex-direction:column;gap:14px;max-width:760px;display:flex}.bkB_ZW_title{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:500;line-height:24px}.bkB_ZW_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}.bkB_ZW_card{flex-direction:column;gap:8px;display:flex}.bkB_ZW_groupTitle{color:var(--dsw-alias-label-secondary);margin:2px 0 0;font-size:14px;font-weight:600;line-height:20px}.bkB_ZW_subGroupTitle{color:var(--dsw-alias-label-tertiary);margin:10px 0 4px;font-size:12px;font-weight:600;line-height:18px}.bkB_ZW_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.bkB_ZW_configHeader{justify-content:space-between;align-items:center;gap:8px;display:flex}.bkB_ZW_formRow{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.bkB_ZW_input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-input-bg);min-width:260px;color:var(--dsw-alias-label-primary);border-radius:8px;outline:none;flex:1;padding:6px 10px;font-size:13px;line-height:20px}.bkB_ZW_input:focus{border-color:var(--dsw-alias-state-primary)}.bkB_ZW_checkRow{color:var(--dsw-alias-label-secondary);cursor:pointer;align-items:center;gap:6px;font-size:13px;line-height:20px;display:inline-flex}.bkB_ZW_checkbox{cursor:pointer;margin:0;display:block}.bkB_ZW_list{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;flex-direction:column;margin:0;padding:0;list-style:none;display:flex;overflow:hidden}.bkB_ZW_row{border-top:1px solid var(--dsw-alias-border-l2);grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px 10px;display:grid}.bkB_ZW_row:first-child{border-top:none}.bkB_ZW_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.bkB_ZW_cellTitle{flex-direction:column;gap:1px;min-width:0;display:flex}.bkB_ZW_name{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;align-items:center;gap:6px;font-size:14px;line-height:22px;display:inline-flex;overflow:hidden}.bkB_ZW_meta{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:12px;line-height:18px;overflow:hidden}.bkB_ZW_actions{align-items:center;gap:6px;display:inline-flex}.bkB_ZW_badge{border-radius:999px;padding:0 8px;font-size:12px;line-height:18px}.bkB_ZW_badgeLoaded{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}.bkB_ZW_empty{color:var(--dsw-alias-label-tertiary);text-align:center;margin:0;padding:16px 12px;font-size:13px;line-height:20px}.bkB_ZW_notice{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.bkB_ZW_noticeOk{color:var(--dsw-alias-state-success-primary)}.bkB_ZW_noticeError{color:var(--dsw-alias-state-error-primary)}.bkB_ZW_confirm{border:1px solid var(--dsw-alias-state-error-primary);border-radius:12px;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;display:flex}.bkB_ZW_confirmText{color:var(--dsw-alias-state-error-primary);flex:1;margin:0;font-size:13px;line-height:20px}";
		const tagId = "dsh-skill-manager/section.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-skill-manager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var section_module_css_default = {
			"noticeOk": "bkB_ZW_noticeOk",
			"section": "bkB_ZW_section",
			"hint": "bkB_ZW_hint",
			"title": "bkB_ZW_title",
			"input": "bkB_ZW_input",
			"cellTitle": "bkB_ZW_cellTitle",
			"row": "bkB_ZW_row",
			"configHeader": "bkB_ZW_configHeader",
			"formRow": "bkB_ZW_formRow",
			"intro": "bkB_ZW_intro",
			"card": "bkB_ZW_card",
			"meta": "bkB_ZW_meta",
			"actions": "bkB_ZW_actions",
			"badge": "bkB_ZW_badge",
			"groupTitle": "bkB_ZW_groupTitle",
			"subGroupTitle": "bkB_ZW_subGroupTitle",
			"checkRow": "bkB_ZW_checkRow",
			"checkbox": "bkB_ZW_checkbox",
			"name": "bkB_ZW_name",
			"badgeLoaded": "bkB_ZW_badgeLoaded",
			"list": "bkB_ZW_list",
			"empty": "bkB_ZW_empty",
			"notice": "bkB_ZW_notice",
			"noticeError": "bkB_ZW_noticeError",
			"confirm": "bkB_ZW_confirm",
			"confirmText": "bkB_ZW_confirmText"
		};
		//#endregion
		//#region src/client/section.tsx
		/**
		* The Skills settings page: the installed-and-loaded skill surface this
		* plugin adds. Rows come from the Host (`list` command through the settings
		* channel); every action rides the same command/result pair.
		*
		* @module dsh-skill-manager/client/section
		*/
		/** Loaded-skill grouping buckets. */
		const GROUP_BY_SOURCE = {
			"project-dsh": "groupProject",
			"project-agents": "groupProject",
			"user-dsh": "groupUser",
			"user-agents": "groupUser",
			custom: "groupCustom",
			bundled: "groupBundled",
			"compat-claude": "groupCompat"
		};
		function groupKey(source) {
			return GROUP_BY_SOURCE[source] ?? "groupOther";
		}
		function parseChangeResult(result) {
			if (!result.ok || result.data === void 0) return void 0;
			try {
				return JSON.parse(result.data);
			} catch {
				return;
			}
		}
		function parseListResult(result) {
			if (!result.ok || result.data === void 0) return void 0;
			try {
				return JSON.parse(result.data);
			} catch {
				return;
			}
		}
		/**
		* Render the Skills settings page.
		* @param props - locale copy, the live section, and the command actions.
		* @returns the section.
		*/
		function SkillManagerSection(props) {
			const { t } = props;
			const section = props.useSection((value) => value);
			const [loaded, setLoaded] = (0, react.useState)(void 0);
			const [sourceInput, setSourceInput] = (0, react.useState)("");
			const [proxyDraft, setProxyDraft] = (0, react.useState)({
				enabled: false,
				url: ""
			});
			const [compatDraft, setCompatDraft] = (0, react.useState)(true);
			const [busy, setBusy] = (0, react.useState)(false);
			const [notice, setNotice] = (0, react.useState)(void 0);
			const [confirmName, setConfirmName] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				if (section.status !== "ready" || section.writable === false) return;
				const value = section.section;
				setProxyDraft(value?.proxy ?? {
					enabled: false,
					url: ""
				});
				setCompatDraft(value?.compatClaude ?? true);
			}, [
				section.status,
				section.writable,
				section.section
			]);
			const refresh = async () => {
				const snapshot = parseListResult(await props.actions.run("list"));
				if (snapshot !== void 0) setLoaded(snapshot);
			};
			(0, react.useEffect)(() => {
				if (section.status !== "ready" || section.writable === false) return;
				refresh().catch(() => {
					setNotice({
						kind: "error",
						text: t("failed", { message: t("unavailable") })
					});
				});
			}, [section.status, section.writable]);
			const report = (result, success) => {
				setNotice({
					kind: result.ok ? "ok" : "error",
					text: result.ok ? success : t("failed", { message: result.message })
				});
			};
			const onInstall = async () => {
				const input = sourceInput.trim();
				if (input.length === 0) return;
				setBusy(true);
				setNotice(void 0);
				try {
					const result = await props.actions.run("install", input);
					const change = parseChangeResult(result);
					if (result.ok && change !== void 0) {
						setSourceInput("");
						const parts = [t("installedCount", { count: String(change.installed.length) })];
						if (change.conflicts.length > 0) parts.push(t("alreadyExists", { names: change.conflicts.join(", ") }));
						if (change.invalid.length > 0) parts.push(t("invalidList", { names: change.invalid.join(", ") }));
						report(result, parts.join("; "));
					} else report(result, t("done"));
					await refresh();
				} catch (error) {
					setNotice({
						kind: "error",
						text: error instanceof Error && error.message === "timeout" ? t("timeout") : t("failed", { message: error instanceof Error ? error.message : String(error) })
					});
				} finally {
					setBusy(false);
				}
			};
			const onUpdate = async (name) => {
				setBusy(true);
				setNotice(void 0);
				try {
					const result = await props.actions.run("update", name);
					report(result, t("updatedCount", { count: "1" }));
					await refresh();
				} catch (error) {
					setNotice({
						kind: "error",
						text: error instanceof Error && error.message === "timeout" ? t("timeout") : t("failed", { message: error instanceof Error ? error.message : String(error) })
					});
				} finally {
					setBusy(false);
				}
			};
			const onUninstall = async () => {
				if (confirmName === void 0) return;
				const name = confirmName;
				setConfirmName(void 0);
				setBusy(true);
				setNotice(void 0);
				try {
					const result = await props.actions.run("uninstall", name);
					report(result, t("removedCount", { count: "1" }));
					await refresh();
				} catch (error) {
					setNotice({
						kind: "error",
						text: error instanceof Error && error.message === "timeout" ? t("timeout") : t("failed", { message: error instanceof Error ? error.message : String(error) })
					});
				} finally {
					setBusy(false);
				}
			};
			const onSaveConfig = async () => {
				setBusy(true);
				setNotice(void 0);
				try {
					await props.actions.setProxy(proxyDraft);
					await props.actions.setCompatClaude(compatDraft);
					setNotice({
						kind: "ok",
						text: t("safe")
					});
				} catch (error) {
					setNotice({
						kind: "error",
						text: t("failed", { message: error instanceof Error ? error.message : String(error) })
					});
				} finally {
					setBusy(false);
				}
			};
			const loadedNames = (0, react.useMemo)(() => new Set((loaded?.loaded ?? []).map((row) => row.name)), [loaded]);
			if (section.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: section_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: section_module_css_default.title,
					children: t("title")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: section_module_css_default.notice,
					children: t("loading")
				})]
			});
			if (section.status === "unavailable" || section.writable === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: section_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: section_module_css_default.title,
					children: t("title")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: `${section_module_css_default.notice} ${section_module_css_default.noticeError}`,
					children: t("unavailable")
				})]
			});
			const groups = (0, react.useMemo)(() => {
				const buckets = /* @__PURE__ */ new Map();
				for (const row of loaded?.loaded ?? []) {
					const key = groupKey(row.source);
					const list = buckets.get(key) ?? [];
					list.push(row);
					buckets.set(key, list);
				}
				return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
			}, [loaded]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: section_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: section_module_css_default.title,
						children: t("title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: section_module_css_default.intro,
						children: t("intro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: section_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: section_module_css_default.groupTitle,
								children: t("installTitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: section_module_css_default.hint,
								children: t("installHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: section_module_css_default.formRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: section_module_css_default.input,
									value: sourceInput,
									placeholder: t("installPlaceholder"),
									disabled: busy,
									onChange: (event) => {
										setSourceInput(event.target.value);
									},
									onKeyDown: (event) => {
										if (event.key === "Enter") onInstall();
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									disabled: busy || sourceInput.trim().length === 0,
									onClick: () => {
										onInstall();
									},
									children: t("install")
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: section_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: section_module_css_default.groupTitle,
							children: t("installedTitle")
						}), loaded === void 0 || loaded.installed.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: section_module_css_default.empty,
							children: t("installedEmpty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: section_module_css_default.list,
							children: loaded.installed.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: section_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: section_module_css_default.cellTitle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: section_module_css_default.name,
										children: [row.name, loadedNames.has(row.name) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `${section_module_css_default.badge} ${section_module_css_default.badgeLoaded}`,
											children: t("loadedBadge")
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: section_module_css_default.meta,
										children: [
											row.source,
											row.tag !== void 0 ? ` @${row.tag}` : "",
											" · ",
											t("updatedAt", { time: new Date(row.updatedAt).toLocaleString() })
										]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: section_module_css_default.actions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										disabled: busy,
										onClick: () => {
											onUpdate(row.name);
										},
										children: t("update")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										disabled: busy,
										onClick: () => {
											setConfirmName(row.name);
										},
										children: t("uninstall")
									})]
								})]
							}, row.name))
						})]
					}),
					confirmName !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: section_module_css_default.confirm,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: section_module_css_default.confirmText,
								children: t("confirmUninstall", { name: confirmName })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy,
								onClick: () => {
									onUninstall();
								},
								children: t("confirm")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy,
								onClick: () => {
									setConfirmName(void 0);
								},
								children: t("cancel")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: section_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: section_module_css_default.configHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: section_module_css_default.groupTitle,
									children: t("loadedTitle")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									disabled: busy,
									onClick: () => {
										refresh();
									},
									children: t("refresh")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: section_module_css_default.hint,
								children: t("loadedHint")
							}),
							groups.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: section_module_css_default.empty,
								children: t("loadedEmpty")
							}) : groups.map(([key, rows]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
								className: section_module_css_default.subGroupTitle,
								children: t(key)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: section_module_css_default.list,
								children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: section_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: section_module_css_default.cellTitle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: section_module_css_default.name,
											children: row.name
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: section_module_css_default.meta,
											children: [row.description, row.resourcePath !== void 0 ? ` · ${row.resourcePath}` : ""]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: section_module_css_default.meta,
										children: row.provider
									})]
								}, `${row.source}\u0000${row.name}`))
							})] }, key))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: section_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: section_module_css_default.groupTitle,
								children: t("proxyLabel")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: section_module_css_default.hint,
								children: t("proxyHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: section_module_css_default.checkRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									className: section_module_css_default.checkbox,
									checked: proxyDraft.enabled,
									disabled: busy,
									onChange: (event) => {
										setProxyDraft((current) => ({
											...current,
											enabled: event.target.checked
										}));
									}
								}), t("proxyLabel")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: section_module_css_default.input,
								value: proxyDraft.url,
								placeholder: "http://127.0.0.1:10808",
								disabled: busy || !proxyDraft.enabled,
								onChange: (event) => {
									setProxyDraft((current) => ({
										...current,
										url: event.target.value
									}));
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: section_module_css_default.checkRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									className: section_module_css_default.checkbox,
									checked: compatDraft,
									disabled: busy,
									onChange: (event) => {
										setCompatDraft(event.target.checked);
									}
								}), t("compatLabel")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: section_module_css_default.hint,
								children: t("compatHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy,
								onClick: () => {
									onSaveConfig();
								},
								children: t("proxySave")
							})
						]
					}),
					notice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: notice.kind === "ok" ? `${section_module_css_default.notice} ${section_module_css_default.noticeOk}` : `${section_module_css_default.notice} ${section_module_css_default.noticeError}`,
						children: notice.text
					})
				]
			});
		}
		//#endregion
		//#region src/client/section-controller.ts
		function bind(scope, project) {
			const listeners = /* @__PURE__ */ new Set();
			let snapshot = project(scope.getSnapshot());
			scope.subscribe(() => {
				snapshot = project(scope.getSnapshot());
				for (const listener of [...listeners]) listener();
			});
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				}
			};
		}
		/**
		* The command channel: writes commands into the section and resolves the
		* matching result, plus the config writes (proxy, compat toggle).
		*/
		var SkillManagerSectionController = class {
			scope;
			/** Live section source bound by the renderer as a hook. */
			sectionSource;
			pending = /* @__PURE__ */ new Map();
			commandSeq = 0;
			/**
			* @param scope - the bound `skill-manager` settings scope.
			*/
			constructor(scope) {
				this.scope = scope;
				this.sectionSource = bind(scope, (live) => ({
					status: live.status,
					writable: live.writable,
					section: live.value
				}));
				scope.subscribe(() => {
					const result = scope.getSnapshot().value?.result;
					if (result === void 0 || result.id === void 0) return;
					const waiter = this.pending.get(result.id);
					if (waiter === void 0) return;
					this.pending.delete(result.id);
					clearTimeout(waiter.timer);
					waiter.resolve(result);
				});
			}
			/**
			* Send one command and wait for its result.
			* @param action - the Host action.
			* @param input - action input (source string or skill name).
			* @param timeoutMs - how long to wait before rejecting.
			* @returns the Host result.
			* @throws Error when the section is not writable or the wait times out.
			*/
			async run(action, input, timeoutMs = 18e4) {
				if (!this.scope.getSnapshot().writable) throw new Error("not-writable");
				const id = `skill-manager-${Date.now().toString(36)}-${this.commandSeq += 1}`;
				const waiter = new Promise((resolve, reject) => {
					const timer = setTimeout(() => {
						if (this.pending.delete(id)) reject(/* @__PURE__ */ new Error("timeout"));
					}, timeoutMs);
					this.pending.set(id, {
						resolve,
						reject,
						timer
					});
				});
				try {
					await this.scope.set("command", {
						id,
						action,
						...input === void 0 ? {} : { input }
					});
				} catch (error) {
					this.pending.delete(id);
					throw error;
				}
				return waiter;
			}
			/** Persist the proxy configuration. */
			async setProxy(proxy) {
				await this.scope.set("proxy", proxy);
			}
			/** Persist the `.claude/skills` compatibility toggle. */
			async setCompatClaude(enabled) {
				await this.scope.set("compatClaude", enabled);
			}
			/** Dispose every pending waiter (component unmount). */
			dispose() {
				for (const [id, waiter] of this.pending) {
					this.pending.delete(id);
					clearTimeout(waiter.timer);
					waiter.reject(/* @__PURE__ */ new Error("disposed"));
				}
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* Locale dictionaries for the Skills settings page.
		*
		* @module dsh-skill-manager/client/locales
		*/
		/** Simplified Chinese product copy. */
		const zh = {
			nav: "技能 (Skills)",
			title: "技能 (Skills)",
			intro: "从 GitHub 仓库安装、更新与卸载 DeepSeek Harness 技能;技能写入用户技能目录后由 Harness 原生热加载,新会话即可使用。",
			groupProject: "项目级",
			groupUser: "用户级",
			groupCustom: "自定义",
			groupBundled: "捆绑",
			groupCompat: "Claude 兼容 (.claude/skills)",
			groupOther: "其他",
			loadedTitle: "当前已加载",
			loadedHint: "按优先级分组展示当前会话可用的技能;项目级技能会覆盖用户级同名技能。",
			loadedEmpty: "暂无已加载技能。",
			installTitle: "安装新技能",
			installHint: "填写 GitHub 来源:owner/repo、owner/repo/sub/path,可加 @tag 指定版本。",
			installPlaceholder: "例如 anthropics/skills/document-skills 或 owner/repo/skills@v1",
			install: "安装",
			installedTitle: "已由本插件管理",
			installedEmpty: "尚未安装任何技能。",
			installedAt: "安装于 {time}",
			updatedAt: "更新于 {time}",
			update: "更新",
			refresh: "刷新",
			uninstall: "卸载",
			confirmUninstall: "卸载技能 {name}?目录与清单记录将被删除,可重新安装。",
			confirm: "确认",
			cancel: "取消",
			proxyLabel: "GitHub 下载代理",
			proxyHint: "中国大陆访问 GitHub 常需代理;开启后自动使用下方地址(支持 http/https 混合代理)。",
			proxyUrl: "代理地址",
			proxySave: "保存",
			compatLabel: "兼容加载 Claude Code 技能 (.claude/skills)",
			compatHint: "只读加载项目下 .claude/skills 中与 DSH 同规范的技能(Claude Code / Cline 通用),不复制文件。",
			safe: "保存成功",
			busy: "正在执行…",
			loading: "正在加载…",
			unavailable: "当前 Harness 的配置存储不可写,页面为只读。",
			timeout: "操作超时,请重试。",
			notWritable: "配置存储不可写,无法下发命令。",
			done: "完成",
			failed: "失败:{message}",
			updatedCount: "已更新 {count} 个技能",
			installedCount: "已安装 {count} 个技能",
			removedCount: "已移除 {count} 个技能",
			alreadyExists: "已存在:{names}(可先卸载或对同名来源使用更新)",
			invalidList: "以下条目格式无效:{names}",
			loadedBadge: "已加载"
		};
		/** English product copy (the dictionary key source of truth). */
		const en = {
			nav: "Skills",
			title: "Skills",
			intro: "Install, update, and uninstall DeepSeek Harness skills from GitHub repositories. Installed skills land in the user skill root and are hot-picked-up by the harness itself, so new sessions use them immediately.",
			groupProject: "Project",
			groupUser: "User",
			groupCustom: "Custom",
			groupBundled: "Bundled",
			groupCompat: "Claude compat (.claude/skills)",
			groupOther: "Other",
			loadedTitle: "Currently loaded",
			loadedHint: "Skills loadable in the current session, grouped by priority; a project-level skill overrides a same-name user-level skill.",
			loadedEmpty: "No skills are currently loaded.",
			installTitle: "Install a new skill",
			installHint: "Enter a GitHub source: owner/repo, owner/repo/sub/path, optionally with @tag.",
			installPlaceholder: "e.g. anthropics/skills/document-skills or owner/repo/skills@v1",
			install: "Install",
			installedTitle: "Managed by this plugin",
			installedEmpty: "Nothing installed yet.",
			installedAt: "Installed {time}",
			updatedAt: "Updated {time}",
			update: "Update",
			refresh: "Refresh",
			uninstall: "Uninstall",
			confirmUninstall: "Uninstall skill {name}? Its directory and manifest record are removed; you can reinstall it later.",
			confirm: "Confirm",
			cancel: "Cancel",
			proxyLabel: "GitHub download proxy",
			proxyHint: "Use a proxy for GitHub downloads (e.g. 127.0.0.1:10808). Supports http/https mixed proxies.",
			proxyUrl: "Proxy URL",
			proxySave: "Save",
			compatLabel: "Load Claude Code skills from .claude/skills",
			compatHint: "Read-only loading of same-spec SKILL.md skills under the project's .claude/skills (Claude Code / Cline); files are never copied.",
			safe: "Saved",
			busy: "Working…",
			loading: "Loading…",
			unavailable: "This harness' settings storage is read-only; the page is read-only.",
			timeout: "The operation timed out; please retry.",
			notWritable: "Settings storage is not writable; cannot send commands.",
			done: "Done",
			failed: "Failed: {message}",
			updatedCount: "Updated {count} skills",
			installedCount: "Installed {count} skills",
			removedCount: "Removed {count} skills",
			alreadyExists: "Already exists: {names} (uninstall first, or update with the same source)",
			invalidList: "Invalid entries skipped: {names}",
			loadedBadge: "loaded"
		};
		//#endregion
		//#region src/client/index.ts
		/** Locale dictionary namespace owned by this section. */
		const NS = "skill-manager";
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"settingsScope"
		];
		/**
		* Mount the Skills settings section.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "skill-manager: section dictionaries");
			const controller = new SkillManagerSectionController(ctx.settingsScope.bind({ namespace: SETTINGS_NS }));
			ctx.effect(() => () => controller.dispose(), "skill-manager: command waiters");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skill-manager",
				order: 17,
				label: () => t("nav"),
				locale: NS,
				inject: () => ({
					hooks: { section: controller.sectionSource },
					actions: {
						run: (action, input) => controller.run(action, input),
						setProxy: (proxy) => controller.setProxy(proxy),
						setCompatClaude: (enabled) => controller.setCompatClaude(enabled)
					}
				})
			}, SkillManagerSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map