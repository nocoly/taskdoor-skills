# 前端任务预览数据结构

生产输出版本：`taskdoor.task-preview.v1`。这是用户可编辑的方案数据，不是 MCP 入参，也不是任务创建回执。完整结构以 [JSON Schema](task-preview.schema.json) 为准。

## 调用输入

调用方提供 `requestId`、`userRequest`、`currentDate`、`timezone` 、`currentMemberId` 和有效 `members`。成员项包括当前工作区成员 `id`、名称与已确认职责；调用方负责身份、权限及有效性核对。`currentMemberId` 用于解析“我负责”等指代；未提供当前人员身份时不能凭首位成员推断。没有资料的成员不得作为可分配人选。可附相关业务资料，避免携带整个历史工作区。

`members` 是预留给调用方注入的当前团队人员变量，不是安装包内固定名单。发起生成前，应用服务通过当前团队成员接口读取有效成员；使用 MCP 时调用 `list_workspace_members({workspaceId, status: "ACTIVE"})`，按 `page.hasMore` 和 `page.nextCursor` 完整读取分页。一次生成或同一批评测复用同一份成员快照，不让模型逐任务重新查询。

| 注入字段 | 数据来源 |
| --- | --- |
| `members[].id` | 成员列表每项的 `id`，即该工作区的成员 ID；不能换成 `user.id` 或显示名称 |
| `members[].name` | 成员列表的 `user.displayName`，供模型识别人名和前端显示 |
| `members[].responsibilities` | 当前团队成员职责接口的数据，或调用方已确认的职责变量；按成员 ID 合并为字符串数组 |
| `currentMemberId` | 已登录用户在当前工作区对应的成员项 `id`，供解析“我负责” |
| `locale` | 界面语言 `zh-CN` 或 `en`；说明类文字用这种语言书写（见 SKILL.md「输出语言」） |

当前 MCP 成员列表不包含职责；`role` 是权限角色，不能替代职责。可由调用方预留 `responsibilitiesByMemberId` 变量，把已确认职责按成员 ID 关联到列表，再组装 `members`。职责缺失用空数组并保留缺口；不能把待邀请、已停用、其他团队成员或按同名猜出的人员混入。列表读取失败时由调用方展示获取失败，不伪装为空团队或使用其他团队名单。

输出中的 `ownerMemberId` 与所有层级的 `participants[].memberId` 必须来自本次 `members[].id`。姓名和职责是输入上下文与显示信息，不取代关联 ID；前端通过 ID 查当前成员目录即可显示人员信息。用户确认后创建前，再核对这些 ID 仍属于当前团队的有效成员。

方案调整时传入 `previousPlan`，其内容是当前前端编辑版本，连同本轮 `userRequest` 描述要调整的部分。前端直接编辑无需每次重新调用模型。未传入旧方案时按新方案生成；不能凭模型记忆当作当前版本。

调用方可提供 `teamTags`，内容为本次团队的标签目录，按[团队标签建议](team-task-tags.md)使用。`taskdoor.task-preview.v1` 没有 `labels`、`icon`、`color` 或 `tagOperations` 输出字段。用户明确索要标签建议时，可在 `summary` 简短说明供人工选用。支持团队标签提案的调用可按其 Schema 返回已有标签的 ID 或名称，以及新标签的名称、图标和颜色。创建任务的预览只提出标签建议。改名、外观修改或删除走具备对应能力的团队标签管理入口，应用按发起人的权限核验。标签建议独立于任务标题、目标和完成标准。

输出先由服务端按前端的读法整理：文本去首尾空白，空的完成标准、执行建议和警告去掉，负责人不重复列为参与人，参与人去重，父任务的 `effortEstimate` 置为 `null`，缺方法或依据的工时视为未知。整理后仍不合规（如空标题、空目标、全空的完成标准、缺协作说明的参与人）时，服务端带 `validationFeedback` 让模型重新输出一次，仍不合规则返回失败；前端不会收到它无法显示的 `ready` 方案。

## 字段

| 字段 | 含义与前端处理 |
| --- | --- |
| `schemaVersion` | 固定 `taskdoor.task-preview.v1`，调用方据此解析 |
| `requestId` | 原样回显输入请求 ID；不是幂等键或授权凭据 |
| `status` | `ready` 表示可供预览；`needs_clarification` 表示仍有关键缺口，都不代表已确认 |
| `summary` | 简短说明本次交付范围，不重复整棵任务树 |
| `tasks` | 根任务数组；共同目标可为一棵树，独立需求可以多根 |
| `duplicates` | 疑似与已有任务重复：`{taskId, relationship, reason}`，`taskId` 只能取自输入 `existingTasks`；`relationship` 为 `same_outcome`、`overlap` 或 `possible`；至多 5 个，补问时为空。服务端返回给页面时补上目录中的 `title` |
| `parentCandidates` | 可以挂接的已有父任务：`{taskId, reason}`，只能取自 `existingTasks` 中 `canCreateChild` 为 `true` 的任务；至多 3 个；用户已选父任务或独立创建、或仍在补问时为空。服务端补上 `title` |
| `questions` | 需要用户回答的关键业务问题，最多 3 个，每项是一道选择题（见下表）；无问题为空数组 |
| `warnings` | 资料缺口、建议假设或分配限制；无内容为空数组 |

补问项字段（全部必填）：

| 补问字段 | 含义与约束 |
| --- | --- |
| `question` | 问题文本，问业务信息，不问接口参数 |
| `choices` | 2–4 个互不相同的选项文本，贴合用户原话与团队成员职责，可直接作为回答；不写“其他”“不确定”等空泛项 |
| `recommended` | 必须逐字等于 `choices` 中的一项，是模型认为最可能的回答 |
| `allowCustom` | 恒为 `true`：前端始终提供自定义回答 |
| `placeholder` | 自定义框里的提示文字：一句贴合这道题的填写示例，例如「说明希望改变的结果，例如让目标客户了解新品功能」；非空，至多 200 字 |

例如 `{"question": "活动在哪一天上线？", "choices": ["本周五", "下周一", "下周五"], "recommended": "本周五", "allowCustom": true, "placeholder": "写明具体日期，例如 10 月 24 日上线"}`。服务端校验选项数量、去重和推荐项归属，不合规的方案整体返回失败。

节点字段全部返回，未明确的可选值用 `null` 或空数组，便于前端直接绑定表单。

| 节点字段 | 含义与约束 |
| --- | --- |
| `clientId` | 本方案内唯一、稳定的临时 ID；修改保留，新增使用新值。不是数据库任务 ID |
| `title` / `goal` | 任务名称 / 交付目标，非空 |
| `acceptanceCriteria` | 非空的逐条完成标准，父节点也需要 |
| `ownerMemberId` | 输入可选成员目录中的 ID，未知或明确暂不分配为 `null` |
| `assignmentReason` | 根据用户选择或已确认职责简要说明推荐依据；未分配时写具体缺口 |
| `participants` | 必要协作人的 `memberId` 和具体 `contribution`；不重复或包含负责人 |
| `dueDate` | `YYYY-MM-DD` 或 `null`；只保留截止日期，不返回开始日期 |
| `executionTips` | 执行建议数组，保持用户指定条目 |
| `effortEstimate` | `null` 或 `{minutes, workMethod, reason}`；整数人工分钟、工作方法及依据 |
| `dependsOnClientIds` | 必须先取得的结果对应的临时 ID；引用本方案节点，单向无环，不等于父子归属 |
| `children` | 同结构子任务数组，叶子为空数组，允许多层嵌套 |

`ready` 时至少有一个任务，无待回答关键问题。没有合适负责人时 `ownerMemberId` 为 `null`，写明缺口但仍可 `ready`；用户可在预览中选择或邀请成员，也可保持未分配后确认创建。截止日期和工时未知本身不阻止预览。完全无法确定交付物时可返回空任务数组和明确问题。

任务树任一路径最多四层，根任务是第 1 层。若方案挂到已有父任务下，调用方要提供父任务绝对层级；最终层级由应用服务在确认时重新校验。多个互不相关的交付可以有多个根任务，应用服务须支持整份多根方案的统一提交；当前调用端若只支持单根，不得静默丢弃其他根任务。

已验证能正确生成本结构的模型，调用方可把 Schema 作为 API 的 JSON Schema 输出约束；在运行副本中将 requestId 限定为本次输入，并将负责人及参与者 ID 限定为本次成员目录，保留负责人为 null 的分支。接口接受 Schema 请求不等于实际正确支持递归树和字符串数组；若实际返回损坏的数组内容，使用 JSON object 模式并在返回后执行完整本地校验，不能为适配接口降低验收要求。不要修改共享 Schema 或把本次人员写入安装包。单纯 JSON object 模式只要求 JSON 对象，不保证这些业务字段与结构。

JSON Schema 验证字段类型；应用还要核对 `clientId` 唯一性、成员引用、有效日期、负责人唯一、参与者去重、依赖存在且无环。这些检查不授予写入权限。

文本数组还须包含实际文本：完成标准不能仅含标点或序列化任务，依赖项不能带 JSON 分隔符；任务树不能在同一分支重复放入相同交付。校验失败时保留原始响应和具体原因，带 `validationFeedback` 最多请求一次完整修正；修正仍失败就返回失败，不替模型补造完成标准或把无效内容标为可用方案。用户主动重试是新的请求。

## 示例

以下示例假设输入成员目录已提供 `member-lead`、`member-writer`、`member-designer` 及对应统筹、文案、视觉职责；仅为解释结构，不可作为默认成员。用户原话：“准备新品发布资料，需要一份讲清用途和卖点的文案、一张海报，海报交源文件和导出图，资料已经确认。按职责分工。”

```json
{
  "schemaVersion": "taskdoor.task-preview.v1",
  "requestId": "request-example",
  "status": "ready",
  "summary": "准备新品发布资料，文案和海报可以并行。",
  "tasks": [
    {
      "clientId": "draft-root",
      "title": "准备新品发布资料",
      "goal": "交付可用于新品发布的文案和海报资料包",
      "acceptanceCriteria": [
        "介绍文案包含用途和已确认的核心卖点",
        "海报源文件与导出图齐全"
      ],
      "ownerMemberId": "member-lead",
      "assignmentReason": "输入职责中承担整体交付统筹",
      "participants": [],
      "dueDate": null,
      "executionTips": [],
      "effortEstimate": null,
      "dependsOnClientIds": [],
      "children": [
        {
          "clientId": "draft-copy",
          "title": "编写新品介绍文案",
          "goal": "交付帮助读者理解产品用途和特点的介绍文案",
          "acceptanceCriteria": [
            "包含产品用途",
            "说明已确认的核心卖点"
          ],
          "ownerMemberId": "member-writer",
          "assignmentReason": "输入职责覆盖文案制作",
          "participants": [],
          "dueDate": null,
          "executionTips": [],
          "effortEstimate": null,
          "dependsOnClientIds": [],
          "children": []
        },
        {
          "clientId": "draft-poster",
          "title": "制作新品发布海报",
          "goal": "交付可用于新品发布的视觉资料",
          "acceptanceCriteria": [
            "使用已确认的卖点文案",
            "交付可编辑源文件和导出图"
          ],
          "ownerMemberId": "member-designer",
          "assignmentReason": "输入职责覆盖视觉设计",
          "participants": [],
          "dueDate": null,
          "executionTips": [],
          "effortEstimate": null,
          "dependsOnClientIds": [],
          "children": []
        }
      ]
    }
  ],
  "questions": [],
  "warnings": []
}
```

### 成员变量注入示例

以下是调用方组装好的输入，不是用户需要填写的表单。示例 ID 只用于说明与上方方案的关联；实际每次调用都替换为当前团队接口取得的成员 ID，不把示例人员作为默认配置。

```json
{
  "requestId": "request-example",
  "userRequest": "准备新品发布资料，需要一份讲清用途和卖点的文案、一张海报，海报交源文件和导出图，资料已经确认。按职责分工。",
  "currentDate": "2026-10-09",
  "timezone": "Asia/Shanghai",
  "currentMemberId": "member-lead",
  "locale": "zh-CN",
  "members": [
    {"id": "member-lead", "name": "统筹成员", "responsibilities": ["统筹交付范围与分工"]},
    {"id": "member-writer", "name": "内容成员", "responsibilities": ["产品介绍文案制作"]},
    {"id": "member-designer", "name": "视觉成员", "responsibilities": ["海报设计与视觉交付"]}
  ]
}
```

## 确认后的应用衔接

前端将模型方案作为草稿展示，用户可以修改字段、人员、顺序和层级，也可以删除任务。应用保存编辑版本，并在用户点击确认时取得这个最终版本；不能重跑模型并用新答案覆盖用户编辑。

执行服务重新校验权限、当前成员、层级和字段，使用临时 ID 映射真实 ID，按父子关系创建，再保存标准、必要参与者和真实依赖。例如 `acceptanceCriteria` 映射到标准写入，`participants` 映射到任务成员，`dependsOnClientIds` 通过本次映射转为真实前置 ID。不能将嵌套 `children` 整体作为单任务创建入参；整份方案须原子提交。

应用持有方案版本和确认状态；模型输出不携带 `confirmed`、写入授权、令牌、真实任务 ID 或成功回执。创建失败保留当前方案，不留下部分任务；提交结果未知时由服务查询同一次操作的结果，再决定是否重试。预览 Skill 不修复真实任务。只读资料不足时仍可输出已有方案与缺口。
